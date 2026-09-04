#!/usr/bin/env node
// scripts/organ-audit-cli.mjs — the one crossing organ-audit.js itself
// does not make: reading a real diff's file list and printing the result
// for a caller (a human, or `.github/workflows/chorus-audit.yml`) to act
// on. organ-audit.js stays pure and importable from a test with zero I/O;
// this is the thin wrapper that gives it real changed files.
//
// Usage:
//   node scripts/organ-audit-cli.mjs <base-ref> [head-ref]
//   node scripts/organ-audit-cli.mjs --files a.js b.js c.js
//
// Prints ONE line of JSON to stdout: {touched, unregistered, auditors}.
// Exit code is always 0 — this is a report, not a gate; a CI workflow
// reads the JSON and decides what "auditors.length > 0" means for itself,
// the same separation `runMeasurement`/its callers already keep between
// computing a result and acting on it.

import { execFileSync } from "node:child_process";
import { CAPACITIES } from "../capacities.js";
import { VERIFICATION_GRID } from "../verification.js";
import { makeOrganAudit, phrase } from "../organ-audit.js";

function changedFilesFromGit(baseRef, headRef) {
  const range = `${baseRef}...${headRef ?? "HEAD"}`;
  const out = execFileSync("git", ["diff", "--name-only", range], {
    encoding: "utf8",
    cwd: new URL("..", import.meta.url).pathname,
  });
  return out.split("\n").map((l) => l.trim()).filter(Boolean);
}

function main(argv) {
  let changedFiles;
  if (argv[0] === "--files") {
    changedFiles = argv.slice(1);
  } else if (argv[0]) {
    changedFiles = changedFilesFromGit(argv[0], argv[1]);
  } else {
    process.stderr.write(
      "usage: organ-audit-cli.mjs <base-ref> [head-ref] | organ-audit-cli.mjs --files <path...>\n",
    );
    process.exit(2);
  }

  const { auditorsFor } = makeOrganAudit({ capacities: CAPACITIES, grid: VERIFICATION_GRID });
  const result = auditorsFor(changedFiles);

  process.stderr.write(phrase(result) + "\n");
  process.stdout.write(
    JSON.stringify({
      touched: result.touched,
      unregistered: result.unregistered,
      auditors: result.auditors,
    }) + "\n",
  );
}

main(process.argv.slice(2));
