// goldens/conduct/score.mjs — read a run back and report it.
//
// Separate from run.mjs on purpose: a run costs model calls, and a scoreboard
// should be re-derivable from the rows it wrote without spending them again.
// The rows are the record; this is a fold over them.
//
//   node goldens/conduct/score.mjs                          # newest run
//   node goldens/conduct/score.mjs results/conduct-…​.jsonl
//   node goldens/conduct/score.mjs --verify                 # answer key only
//   node goldens/conduct/score.mjs a.jsonl --against b.jsonl
//
// No aggregate number is printed, and that is a decision rather than an
// omission. A single "conduct score" would average a family the controls
// certified with a family they refused, and the whole point of the control
// gate is that those two are not the same kind of fact.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { scoreFamilies, verify } from "./checks.mjs";
import { readCorpus } from "./fetch.mjs";
import { tokenize } from "../../source.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ITEMS = JSON.parse(readFileSync(join(HERE, "items.json"), "utf8"));
const RESULTS = join(HERE, "results");

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
};

function newestRun() {
  if (!existsSync(RESULTS)) return null;
  const rows = readdirSync(RESULTS)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => ({ f: join(RESULTS, f), t: statSync(join(RESULTS, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return rows[0]?.f ?? null;
}

const load = (path) =>
  readFileSync(path, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));

function report(path) {
  const rows = load(path);
  const families = scoreFamilies(rows);

  console.log(`\n${path}\n${"".padEnd(path.length, "─")}`);
  for (const f of families) {
    const decl = ITEMS.families[f.family];
    console.log(`\n${f.family} — ${decl?.asks ?? ""}`);
    console.log(`  status ${f.status}   controls ${f.controls}   probes ${f.passed}/${f.of}`);
    if (f.status === "degenerate") {
      console.log(`  NOT SCORED: the control failed, so these passes cannot be told from the reflex`);
      console.log(`  reflex this family gates against: ${decl?.degenerate ?? "(undeclared)"}`);
    }
    for (const r of f.rows) {
      console.log(
        `    ${r.id.padEnd(9)} ${r.control ? "ctl" : "   "} ${(r.pass ? "pass" : "FAIL").padEnd(4)} ` +
          `${String(r.verdict).slice(0, 60)}`,
      );
    }
  }

  // Where a fix has to land, which is the thing this golden is actually for.
  const failed = rows.filter((r) => !r.pass && !r.control);
  const byRung = new Map();
  for (const r of failed) byRung.set(r.rung, [...(byRung.get(r.rung) ?? []), r.id]);
  console.log(`\n— open, by the rung a fix must land on —`);
  for (const rung of ["mechanical", "grammar", "mouth"]) {
    const ids = byRung.get(rung) ?? [];
    if (ids.length) console.log(`  ${rung.padEnd(11)} ${ids.join(" ")}`);
  }
  if (!failed.length) console.log("  (none)");
  return rows;
}

function main() {
  if (process.argv.includes("--verify")) {
    const v = verify(ITEMS.items, readCorpus(), { tokenize });
    for (const r of v.rows) {
      console.log(`${r.ok ? "ok  " : "FAIL"} ${r.item.padEnd(9)} ${String(r.value).padEnd(38)} ${r.observed}`);
    }
    console.log(`\n${v.rows.filter((r) => r.ok).length}/${v.rows.length} hold`);
    process.exit(v.ok ? 0 : 1);
  }

  const path = process.argv[2]?.startsWith("--") ? newestRun() : process.argv[2] ?? newestRun();
  if (!path) {
    console.error("no run to score — `node goldens/conduct/run.mjs` first");
    process.exit(1);
  }
  const rows = report(path);

  const against = arg("--against");
  if (against) {
    const other = new Map(load(against).map((r) => [r.id, r]));
    console.log(`\n— moved against ${against} —`);
    let moved = 0;
    for (const r of rows) {
      const o = other.get(r.id);
      if (!o || o.pass === r.pass) continue;
      moved++;
      console.log(`  ${r.id.padEnd(9)} ${o.pass ? "pass → FAIL" : "FAIL → pass"}   ${r.verdict}`);
    }
    if (!moved) console.log("  (nothing moved)");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
