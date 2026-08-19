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

import { ROSTER, REFUSED, SEVERED, continues, isControl, csvTable, formatCells, autoRunnable, parseRunCommand, rubyBlockDepth, rBracketDepth } from "./term.js";
import { SEVERED as JS_SEVERED } from "./term-js-worker.mjs";
import { SEVERED as PY_SEVERED, mountName } from "./term-py-worker.mjs";
import { SEVERED as RUBY_SEVERED, mountName as rubyMountName } from "./term-ruby-worker.mjs";
import { SEVERED as PHP_SEVERED, mountName as phpMountName } from "./term-php-worker.mjs";
import { SEVERED as R_SEVERED, mountName as rMountName } from "./term-r-worker.mjs";

const here = (f) => new URL(`./${f}`, import.meta.url);
const src = (f) => readFileSync(here(f), "utf8");
const TERM_FILES = ["term.js", "term-js-worker.mjs", "term-py-worker.mjs", "term-sql-worker.js", "term-ruby-worker.mjs", "term-php-worker.mjs", "term-r-worker.mjs"];

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

test("the severed list is one list, held in six workers, and each severs", () => {
  assert.deepEqual(JS_SEVERED, SEVERED, "the js worker's list drifted");
  assert.deepEqual(PY_SEVERED, SEVERED, "the python worker's list drifted");
  assert.deepEqual(RUBY_SEVERED, SEVERED, "the ruby worker's list drifted");
  assert.deepEqual(PHP_SEVERED, SEVERED, "the php worker's list drifted");
  // r severs the SAME canonical list, in ITS OWN scope — disclosed in its
  // own header as real but narrower than the other five, since webR's
  // nested engine worker is not this file's to sever. The list agreement
  // still matters: it is what this repo's own controller-side containment
  // actually promises, stated as exactly that, not silently skipped.
  assert.deepEqual(R_SEVERED, SEVERED, "the r worker's list drifted");
  const sqlSrc = src("term-sql-worker.js");
  for (const name of SEVERED) assert.ok(sqlSrc.includes(`"${name}"`), `the sql worker's list lost ${name}`);
  for (const file of TERM_FILES.slice(1)) assert.ok(src(file).includes("defineProperty"), `${file} no longer severs`);
  for (const name of ["fetch", "XMLHttpRequest", "WebSocket", "importScripts"]) {
    assert.ok(SEVERED.includes(name), `the canonical list lost ${name}`);
  }
});

test("a mounted source name cannot carry a path — ruby, php, and r agree with python's mountName", () => {
  for (const fn of [rubyMountName, phpMountName, rMountName]) {
    assert.equal(fn("a/b.txt"), mountName("a/b.txt"));
    assert.equal(fn("..\\up"), mountName("..\\up"));
    assert.equal(fn(""), "_");
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
  for (const r of ["fold", "js", "python", "sql", "ruby", "r", "php"]) assert.equal(continues(r, "long \\", ""), true, r);
});

test("the continuation grammar: ruby buffers on def/class/module/case/begin/for/if/unless/while/until and a trailing do, until end closes every level", () => {
  assert.equal(continues("ruby", "def greet(name)", ""), true);
  assert.equal(continues("ruby", "  puts name", "def greet(name)"), true, "still inside the def");
  assert.equal(continues("ruby", "end", "def greet(name)\n  puts name"), false, "end closes the one open level");
  assert.equal(continues("ruby", "[1,2].each do |x|", ""), true, "a trailing `do |x|` opens a block");
  assert.equal(continues("ruby", "x = 1", ""), false, "an ordinary line never buffers");
  assert.equal(continues("ruby", 'puts "hi" if x', ""), false, "the statement-modifier form never opens — if is not first on the line");
  assert.equal(continues("ruby", "if x", "def f"), true, "a nested opener inside an already-open def keeps buffering past the first end");
  assert.equal(continues("ruby", "end", "def f\n  if x"), true, "one end only closes one of two open levels");
});

test("the continuation grammar: r buffers on unbalanced ( { [ , never counting a bracket inside a string or a # comment", () => {
  assert.equal(continues("r", "f <- function(x) {", ""), true);
  assert.equal(continues("r", "  x + 1", "f <- function(x) {"), true);
  assert.equal(continues("r", "}", "f <- function(x) {\n  x + 1"), false, "the closing brace balances it");
  assert.equal(continues("r", "1 + 1", ""), false, "balanced code never buffers");
  assert.equal(continues("r", 'x <- "("', ""), false, "a bracket inside a string is not a real opener");
  assert.equal(continues("r", "y <- 1 # (", ""), false, "a bracket inside a # comment is not a real opener");
});

test("rubyBlockDepth and rBracketDepth are exported pure functions, not only reachable through continues()", () => {
  assert.equal(rubyBlockDepth("def f\nend"), 0);
  assert.equal(rubyBlockDepth("class C\n  def m\n"), 2, "two openers, no closer yet");
  assert.equal(rBracketDepth("(a, [b, {c: 1"), 3);
  assert.equal(rBracketDepth("f(1, 2)"), 0);
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

// ── /run: the chat door onto the same sandbox (added 2026-08-18) ───────────

test("ROSTER's type field is consolidated, not a duplicated ternary in spawn()/runSandboxed", () => {
  const body = src("term.js");
  assert.ok(
    !/name === "sql" \? "classic" : "module"/.test(body) && !/key === "sql" \? "classic" : "module"/.test(body),
    "the module/classic ternary this consolidation was supposed to remove still exists somewhere",
  );
  assert.ok(/ROSTER\[name\]\.type/.test(body), "spawn() no longer reads the worker type off ROSTER");
  assert.ok(/ROSTER\[key\]\.type/.test(body), "runSandboxed no longer reads the worker type off ROSTER");
});

test("ROSTER's type field agrees with each worker file's own module shape", () => {
  for (const [name, r] of Object.entries(ROSTER)) {
    if (r.kind !== "worker") continue;
    assert.ok(r.type === "module" || r.type === "classic", `${name} has no valid type field`);
    const body = src(r.src.slice(2));
    const isESM = /\bexport\s+(const|function|class|\{)/.test(body);
    if (r.type === "module") assert.ok(isESM, `${name} is typed "module" but ${r.src} has no ESM export`);
    else assert.ok(!isESM, `${name} is typed "classic" but ${r.src} uses ESM export syntax, which a classic worker cannot load`);
  }
});

test("autoRunnable now accepts sql, alongside python and js/javascript", () => {
  assert.equal(autoRunnable("sql"), true);
  assert.equal(autoRunnable("SQL"), true, "case-insensitive, like the other runtimes");
  assert.equal(autoRunnable("python"), true);
  assert.equal(autoRunnable("javascript"), true);
  assert.equal(autoRunnable("perl"), false, "not every runtime is sandboxed — only what AUTO_RUN_LANGS names");
});

test("autoRunnable accepts ruby and php (fully severed, no nested worker) but refuses r (the disclosed nested-worker sandbox gap)", () => {
  assert.equal(autoRunnable("ruby"), true);
  assert.equal(autoRunnable("RUBY"), true, "case-insensitive, like the other runtimes");
  assert.equal(autoRunnable("php"), true);
  assert.equal(autoRunnable("r"), false, "r's own nested worker is not this repo's to sever — terminal-only by design, never auto-run");
  assert.equal(autoRunnable("R"), false);
});

test("parseRunCommand: a whole /run <runtime>\\n<code> parses to {runtime, code}", () => {
  assert.deepEqual(parseRunCommand("/run python\nprint(2+2)"), { runtime: "python", code: "print(2+2)" });
  assert.deepEqual(parseRunCommand("/run SQL\nselect 1;"), { runtime: "sql", code: "select 1;" }, "the runtime folds case; the code does not");
  // Multi-line code carries every line verbatim, including a python body's
  // own indentation — the parser must not trim what the author wrote.
  assert.deepEqual(parseRunCommand("/run python\ndef f():\n    return 1\n"), { runtime: "python", code: "def f():\n    return 1\n" });
});

test("parseRunCommand: missing code (no second line, or a blank one) falls through as null", () => {
  assert.equal(parseRunCommand("/run python"), null, "no newline at all — nothing follows the runtime");
  assert.equal(parseRunCommand("/run python\n"), null, "a second line that is empty");
  assert.equal(parseRunCommand("/run python\n   \n  "), null, "a second line that is only whitespace");
  assert.equal(parseRunCommand("/run\nprint(1)"), null, "no runtime named at all");
});

test("parseRunCommand: an unrunnable runtime is a typed refusal, never null and never a silent run", () => {
  const r = parseRunCommand("/run lua\nprint(1)");
  assert.equal(r.refused.type, "unsupported_runtime");
  assert.match(r.refused.detail, /lua/);
  const foldAttempt = parseRunCommand("/run fold\nsources");
  assert.equal(foldAttempt.refused.type, "unsupported_runtime", "fold is a terminal runtime, not sandboxed code — /run does not reach it either");
});

test("parseRunCommand: ruby and php run from chat now; r is refused by name, not by shape — its nested-worker gap keeps it terminal-only", () => {
  assert.deepEqual(parseRunCommand("/run ruby\nputs 1"), { runtime: "ruby", code: "puts 1" });
  assert.deepEqual(parseRunCommand("/run php\necho 1;"), { runtime: "php", code: "echo 1;" });
  const refused = parseRunCommand("/run r\n1 + 1");
  assert.equal(refused.refused.type, "unsupported_runtime");
  assert.match(refused.refused.detail, /"r"/);
});

test("parseRunCommand: text with no /run prefix at all is null — the door falls through, never refuses", () => {
  assert.equal(parseRunCommand("just some ordinary chat\nwith a second line too"), null);
  assert.equal(parseRunCommand("print(2+2)"), null);
  assert.equal(parseRunCommand(""), null);
});
