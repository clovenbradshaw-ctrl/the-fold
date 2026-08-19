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
//
// A database FOLD (store.js, store-sql.js) needs to know what a mutating
// statement actually changed — but the diffing INTELLIGENCE (which columns
// changed, what counts as a mutation, the CSV→insertRow translation) lives
// entirely in store-sql.js, a plain ES module the caller (term.js, main
// thread) already imports normally. This worker stays a dumb executor: the
// caller tells it, per exec, which table names to snapshot before and after
// (`m.snapshotTables` — an explicit list, or an empty array meaning "you
// pick, off your own sqlite_master"), and this file's only new job is
// running `SELECT rowid, * FROM <table>` on either side and handing the
// two raw result sets back unexamined. The caller diffs them
// (store-sql.js::deriveStoreOps) and decides what, if anything, to log —
// this file never imports store.js or store-sql.js, and never decides what
// a change means, only what a table currently holds.

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

/** Every table this db currently has, off its own catalog — the fallback
 * when the caller could not cheaply name which tables a statement touches
 * (store-sql.js::detectTables returned nothing, or was never asked). */
function listTables() {
  try {
    var r = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    return r.length ? r[0].values.map(function (row) { return row[0]; }) : [];
  } catch (e) {
    return [];
  }
}

/** `SELECT rowid, * FROM <table>` for every named table, raw — store-sql.js
 * reads this shape directly (its own snapshotFromExec). `null` names a
 * table that does not exist (sql.js throws on that; this worker turns the
 * throw into the typed absence store-sql.js's own convention expects);
 * `undefined` (sql.js's own real behaviour, confirmed against the package,
 * never assumed) means the table exists with zero rows. Bare identifiers
 * only — the caller only ever names tables it itself detected off SQL
 * text the same way, so nothing here needs to sanitize what it is handed. */
function snapshotNames(names) {
  var out = {};
  for (var i = 0; i < names.length; i++) {
    var t = names[i];
    try {
      var r = db.exec("SELECT rowid, * FROM " + t);
      out[t] = r.length ? r[0] : undefined;
    } catch (e) {
      out[t] = null;
    }
  }
  return out;
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
  // The caller (term.js) only sends `snapshotTables` when it already
  // detected this text as mutating (store-sql.js::looksMutating) — a bare
  // SELECT, a dot-command, DDL alone: none of these carry the field, so
  // none of them pay for a `SELECT rowid, *` round trip they have no use
  // for. A non-null, EMPTY array is the caller's own signal for "could not
  // cheaply name the table(s) — use your own catalog"; a non-empty array
  // names them explicitly, cheaply, off the statement's own text.
  var trackNames = Array.isArray(m.snapshotTables)
    ? (m.snapshotTables.length ? m.snapshotTables : listTables())
    : null;
  var before = trackNames ? snapshotNames(trackNames) : null;
  try {
    runSql(dotCommand(m.code) || String(m.code || ""));
  } catch (e) {
    self.postMessage({ type: "err", text: e.message });
  }
  if (trackNames) {
    // Re-derive the AFTER name list on the full-catalog fallback only — a
    // batch that itself ran CREATE TABLE needs the after side to see the
    // new table too, and re-querying sqlite_master is the only honest way
    // to know that. The explicit-name case reuses the same names on both
    // sides by construction (a name snapshotted by NAME diffs correctly
    // whether or not it existed yet on the before side).
    var afterNames = m.snapshotTables.length ? trackNames : listTables();
    self.postMessage({ type: "snapshots", before: before, after: snapshotNames(afterNames) });
  }
  self.postMessage({ type: "done", ms: Date.now() - started });
};
