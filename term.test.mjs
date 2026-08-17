// term.test.mjs — the sandboxed terminal's conformance: P18's assay.
//
// The policy in one line: nothing typed in the terminal reaches the
// machine. The walls that hold it up are scanned here — the exec route
// gone from the server, the PTY helper gone from disk, no non-local host
// and no exec call in any terminal file, the severed egress list agreeing
// across all three workers — and the pure parts (the continuation grammar
// with its control-word rule, the CSV walk and its all-or-nothing typing,
// the roster and its typed refusals) run against their real cases.

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { ROSTER, REFUSED, SEVERED, continues, isControl, csvTable, formatCells } from "./term.js";
import { SEVERED as JS_SEVERED } from "./term-js-worker.mjs";
import { SEVERED as PY_SEVERED, mountName } from "./term-py-worker.mjs";

const here = (f) => new URL(`./${f}`, import.meta.url);
const src = (f) => readFileSync(here(f), "utf8");
const TERM_FILES = ["term.js", "term-js-worker.mjs", "term-py-worker.mjs", "term-sql-worker.js"];

test("P18: the PTY path is gone — no exec route on the server, no helper on disk", () => {
  const serve = src("serve.mjs");
  assert.ok(!serve.includes("api/exec"), "serve.mjs holds an exec route again");
  assert.ok(!serve.includes("pty-exec"), "serve.mjs names the PTY helper again");
  assert.ok(!existsSync(here("tools/pty-exec.py")), "the PTY helper is back on disk");
});

test("P18: no terminal file (or the page) reaches for an exec route", () => {
  for (const file of [...TERM_FILES, "app.js", "index.html"]) {
    assert.ok(!src(file).includes("api/exec"), `${file} references an exec route`);
  }
});

test("II.13: no host but localhost anywhere the terminal's files reach", () => {
  for (const file of TERM_FILES) {
    const hosts = [...src(file).matchAll(/https?:\/\/([^/"'` )>]+)/g)].map((m) => m[1]);
    for (const h of hosts)
      assert.ok(/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(h), `non-local host in ${file}: ${h}`);
  }
});

test("the severed list is one list, held in three workers, and each severs", () => {
  assert.deepEqual(JS_SEVERED, SEVERED, "the js worker's list drifted");
  assert.deepEqual(PY_SEVERED, SEVERED, "the python worker's list drifted");
  const sqlSrc = src("term-sql-worker.js");
  for (const name of SEVERED) assert.ok(sqlSrc.includes(`"${name}"`), `the sql worker's list lost ${name}`);
  for (const file of TERM_FILES.slice(1)) assert.ok(src(file).includes("defineProperty"), `${file} no longer severs`);
  for (const name of ["fetch", "XMLHttpRequest", "WebSocket", "importScripts"]) {
    assert.ok(SEVERED.includes(name), `the canonical list lost ${name}`);
  }
});

test("the continuation grammar: python buffers on a colon until an empty line", () => {
  assert.equal(continues("python", "for i in x:", ""), true);
  assert.equal(continues("python", "    body", "buf"), true);
  assert.equal(continues("python", "", "buf"), false, "an empty line must flush");
  assert.equal(continues("python", "x = 1", ""), false);
});

test("the continuation grammar: sql waits for a semicolon, except dot-commands and empty lines", () => {
  assert.equal(continues("sql", "select 1", ""), true);
  assert.equal(continues("sql", "select 1;", ""), false);
  assert.equal(continues("sql", ".tables", ""), false);
  assert.equal(continues("sql", "", "buf"), false, "an empty line must flush");
  assert.equal(continues("sql", "where x = 2", "buf"), true);
});

test("the continuation grammar: a trailing backslash continues anywhere; js otherwise runs the line", () => {
  assert.equal(continues("js", "2+2", ""), false);
  assert.equal(continues("js", "const a = [1,", ""), false);
  for (const r of ["fold", "js", "python", "sql"]) assert.equal(continues(r, "long \\", ""), true, r);
});

test("the control-word rule: exit/clear/mount never join a statement buffer", () => {
  // The measured failure: sql's semicolon rule swallowed `exit` and the
  // prompt wedged at "…". Control words are checked before continues().
  for (const w of ["exit", "clear", "mount"]) assert.equal(isControl(w, ""), true, w);
  assert.equal(isControl("exit", "select 1"), false, "mid-statement, exit is just a word");
  assert.equal(isControl("exit;", ""), false);
  assert.equal(continues("sql", "exit", ""), true, "the grammar alone would still swallow it — the order is the fix");
});

test("csv → table: quotes carry commas, newlines, and doubled quotes; empty is NULL", () => {
  const t = csvTable('city,stops,riders\nNashville,12,4500\n"Cook, J",3,180\n"a\nb",,\n"said ""hi""",1,2\n');
  assert.deepEqual(t.columns.map((c) => c.name), ["city", "stops", "riders"]);
  assert.deepEqual(t.columns.map((c) => c.type), ["TEXT", "INTEGER", "INTEGER"]);
  assert.deepEqual(t.rows[1], ["Cook, J", 3, 180]);
  assert.deepEqual(t.rows[2], ["a\nb", null, null], "empty fields load as NULL");
  assert.equal(t.rows[3][0], 'said "hi"');
});

test("csv → table: the typing is all-or-nothing per column, never a sampled guess", () => {
  const t = csvTable("a,b,c,d\n1,1.5,x,\n2,2,3,\n");
  assert.deepEqual(t.columns.map((c) => c.type), ["INTEGER", "REAL", "TEXT", "TEXT"], "one non-number makes TEXT; all-empty is TEXT");
});

test("csv → table: headers sanitize to sql names, ragged rows are said", () => {
  const t = csvTable("riders (avg),2 start,\n1,2,3\n4\n");
  assert.deepEqual(t.columns.map((c) => c.name), ["riders_avg", "c2_start", "c3"]);
  assert.equal(t.ragged, true, "a short row is disclosed, not padded silently");
  assert.deepEqual(t.rows[1], [4, null, null]);
});

test("formatCells aligns columns under a rule", () => {
  const out = formatCells(["n", "riders"], [[3, 7780]]);
  assert.deepEqual(out.split("\n"), ["n  riders", "─  ──────", "3  7780"]);
});

test("the roster is local modules that exist; every refusal carries its reason", () => {
  for (const [name, r] of Object.entries(ROSTER)) {
    if (r.kind === "builtin") continue;
    assert.ok(r.src.startsWith("./"), `${name} loads from somewhere other than this directory`);
    assert.ok(existsSync(here(r.src.slice(2))), `${name}'s module is missing: ${r.src}`);
  }
  for (const name of ["bash", "node", "npm", "webcontainers", "ssh"]) {
    assert.ok(typeof REFUSED[name] === "string" && REFUSED[name].length > 20, `${name} is refused without a reason`);
  }
});

// P21: pip is no longer a blanket refusal — `pip install <name>` is a real
// fold command (the wheel organ), closed to pyodide's own vetted set.
test("P21: pip is not in REFUSED — it is a real command now, not a typed refusal", () => {
  assert.equal(REFUSED.pip, undefined, "pip should be a fold command, not a REFUSED entry");
});

test("P21: the python worker still refuses `pip install …` typed as Python, with a redirect", () => {
  const worker = src("term-py-worker.mjs");
  assert.ok(worker.includes("%pip"), "the in-Python pip guard is gone");
  assert.match(worker, /isn't Python/, "the guard no longer explains itself");
});


test("a mounted source name cannot carry a path", () => {
  assert.ok(!mountName("a/b.txt").includes("/"));
  assert.ok(!mountName("..\\up").includes("\\"));
  assert.ok(!mountName("../../etc").startsWith("."));
  assert.equal(mountName(""), "_");
});
