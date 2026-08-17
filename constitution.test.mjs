// constitution.test.mjs — the assay. Walks constitution.js's enforcement map
// and probes each row's actual behavior with the real organs, so "the app
// follows its constitution" is a test run rather than an assertion (VI.1:
// an article is a failing test or it is an exception). The unwired list is
// tested too — VI.3 only works if unwired stays visible.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

import {
  CONSTITUTION_PROMPT,
  ENFORCEMENT,
  enforcedArticles,
  unwiredArticles,
} from "./constitution.js";
import { chunkSource, openQuestions, readRange, retrieve, checkCitations } from "./source.js";
import { checkGrounding, unsupportedClaims } from "./grounding.js";
import { attribute } from "./cite.js";
import { updateSummaryWithFold, emptySummary, addWarrantRecord, buildWarrantRecord, buildSummarySystemMessage, buildRecordSystemMessage } from "./fold.js";
import { parsePlan } from "./holon.js";

const TEXT =
  "The Kessington report put the harbor figure at 12% for the spring quarter.\n\n" +
  "Dredging of the shipping channel runs through March under the port authority schedule.";
const chunks = chunkSource("notes.txt", TEXT);

test("the fold of the constitution is prose a small model can carry", () => {
  assert.ok(CONSTITUTION_PROMPT.length > 0);
  // Prose in, prose out: no bracket-tag scaffolding, no angle-bracket slots,
  // one paragraph. What goes in front of a small model comes back out of it.
  assert.ok(!/[<>]/.test(CONSTITUTION_PROMPT));
  assert.ok(!CONSTITUTION_PROMPT.includes("\n"));
  // The request register, not the enforcement register: the fold asks for
  // citing and gap-naming; it never claims the checking happens in the model.
  assert.ok(/cite/.test(CONSTITUTION_PROMPT));
  assert.ok(/gap/.test(CONSTITUTION_PROMPT));
});

test("the enforcement map is well-formed and partitions honestly", () => {
  for (const row of ENFORCEMENT) {
    assert.ok(row.article);
    assert.ok([true, "partial", null].includes(row.enforced));
    if (row.enforced === null) assert.equal(row.holds, null);
    else assert.ok(row.holds);
  }
  const enforced = enforcedArticles();
  const unwired = unwiredArticles();
  assert.ok(enforced.length >= 6);
  assert.ok(unwired.length >= 1, "an empty unwired list would claim full compliance");
  assert.ok(enforced.every((e) => e.enforced === true));
  assert.ok(unwired.every((e) => e.enforced === null));
});

test("II.3 descent: a ref re-opens the exact bytes it names", () => {
  const c = chunks[0];
  const body = readRange({ "notes.txt": TEXT }, c.ref);
  assert.equal(body, TEXT.slice(c.start, c.end));
});

test("II.5 firewall: a refresh reply cannot rewrite the record", () => {
  let summary = addWarrantRecord(
    emptySummary(),
    buildWarrantRecord({ turn: 1, gist: "g", channels: ["cited"], refs: ["notes.txt#0-74"], unsupported: [], open: [] }),
  );
  const hostile = JSON.stringify({
    topic: "t",
    flow: "f",
    entities: [],
    context: "c",
    records: [{ turn: 1, gist: "REWRITTEN", refs: ["forged.txt#0-1"] }],
  });
  summary = updateSummaryWithFold(summary, "Q: q A: a", hostile);
  assert.equal(summary.records.length, 1);
  assert.equal(summary.records[0].refs[0], "notes.txt#0-74");
  assert.notEqual(summary.records[0].gist, "REWRITTEN");
});

test("II.9 mouth: an invented figure, name, or address is caught mechanically", () => {
  const answer = "The harbor figure was 47% according to the Marlborough audit. [other.txt#0-9]";
  const grounding = checkGrounding(answer, chunks, { question: "harbor?" });
  const flagged = unsupportedClaims(grounding).join(" ");
  assert.ok(flagged.includes("47"));
  assert.ok(/marlborough/i.test(flagged));
  const { unsupported } = checkCitations(answer, chunks);
  assert.deepEqual(unsupported, ["other.txt#0-9"]);
});

test("II.9 mouth: attribution is null-gated, never a guess with a tag", () => {
  const verbatim = attribute("The Kessington report put the harbor figure at 12% for the spring quarter.", [chunks[0]], chunks);
  assert.equal(verbatim[0].ref, chunks[0].ref);
  const unrelated = attribute("Quarterly synergies improved across the board.", [chunks[0]], chunks);
  assert.equal(unrelated[0].ref, null);
});

// II.13's file set is DERIVED, not hand-maintained: it walks the real
// import graph from the two page entry points (index.html, explore.html),
// the way a browser would actually load them. AUDIT-2026-08-16.md findings
// 4 and 8 verified the previous hardcoded 13-file list had drifted —
// ~10 page-loaded modules, explore/explore.css (a stylesheet is exactly
// where a webfont would hide), and the vendored explore/vendor/viselect.mjs
// all escaped every host scan in the repo. A walk cannot drift the same
// way: a file stops being scanned only if the page stops loading it, and a
// newly wired file is picked up the next run with no edit here.
const REPO = new URL("./", import.meta.url);
const PAGE_ENTRIES = ["index.html", "explore.html"];

// Bytes this repo does not own, so the walk does not read into them —
// each excluded prefix is its own reason, not a silent drop:
//   node_modules/**   vendored third-party bundles (monaco, pyodide,
//                     sql.js), served from localhost per P1/P18 but not
//                     this repo's own code
//   /engine/**        server-mounted from the sibling eoreader6 repo
//   /nul/**           (CLAUDE.md: "leave everything you can in eoreader6")
//                     — governed by that repo's own tests, not this one
const OUT_OF_SCOPE = [/^\/?node_modules\//, /^\/?engine\//, /^\/?nul\//];

function specsIn(relPath, src) {
  const specs = new Set();
  if (/\.html$/.test(relPath)) {
    for (const m of src.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi))
      specs.add(m[1]);
  } else if (/\.css$/.test(relPath)) {
    for (const m of src.matchAll(/@import\s+(?:url\()?["']([^"']+)["']/g)) specs.add(m[1]);
    for (const m of src.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) specs.add(m[1]);
  } else {
    // the "from" clause of a static import/export — matches across a
    // multi-line destructured import list, since "from" sits right before
    // the specifier no matter how the names above it wrap
    for (const m of src.matchAll(/\bfrom\s*["']([^"']+\.(?:m?js|css))["']/g)) specs.add(m[1]);
    // side-effect import "./x.js"; and dynamic import("./x.js")
    for (const m of src.matchAll(/\bimport\s*\(?\s*["']([^"']+\.(?:m?js|css))["']/g)) specs.add(m[1]);
    // a bare path literal naming a loadable file — the only way to reach a
    // Worker's own module (new Worker(new URL(ROSTER[name].src, ...))) or
    // an importScripts() target without special-casing either construct
    for (const m of src.matchAll(/["'`](\.{0,2}\/[^"'`\s]+\.(?:m?js|css))["'`]/g)) specs.add(m[1]);
  }
  return [...specs];
}

function walkPageLoadedFiles() {
  const reached = new Map(); // relPath -> URL
  const queue = [];
  for (const entry of PAGE_ENTRIES) {
    const url = new URL(entry, REPO);
    if (existsSync(url)) { reached.set(entry, url); queue.push([entry, url]); }
  }
  while (queue.length) {
    const [relPath, fromUrl] = queue.shift();
    const src = readFileSync(fromUrl, "utf8");
    for (const spec of specsIn(relPath, src)) {
      if (/^(https?:|data:|blob:|#)/.test(spec)) continue; // not a same-origin file load
      if (OUT_OF_SCOPE.some((re) => re.test(spec))) continue;
      const childUrl = spec.startsWith("/") ? new URL(spec.slice(1), REPO) : new URL(spec, fromUrl);
      if (!childUrl.href.startsWith(REPO.href)) continue; // resolves outside the repo root
      const childRel = decodeURIComponent(childUrl.href.slice(REPO.href.length));
      if (!/\.(m?js|css|html)$/.test(childRel)) continue; // only source text is worth reading/walking
      if (reached.has(childRel) || !existsSync(childUrl)) continue;
      reached.set(childRel, childUrl);
      queue.push([childRel, childUrl]);
    }
  }
  return reached;
}

test("II.13 local: no host but localhost appears anywhere the page can reach", () => {
  // Declared allowances: each names the one host, the exact file(s) it is
  // expected in, and why the string is not a request this page makes.
  // Never a wildcard — the loop below verifies both directions: an
  // undeclared host anywhere in the reached set fails, AND a declared
  // allowance not actually found in its named file fails too, so a stale
  // entry cannot rot into a silent escape hatch.
  const ALLOWANCES = [
    { host: "www.w3.org", files: ["index.html", "explore.html", "explore/explore.js"], reason: "SVG xmlns namespace identifier — parsed by the browser, never fetched" },
    { host: "web.archive.org", files: ["web.js"], reason: "P13 archive-address naming — a string built for display/linking, not a fetch this page issues" },
    { host: "github.com", files: ["explore/vendor/viselect.mjs"], reason: "vendored file's own license header comment" },
    { host: "stackoverflow.com", files: ["explore/vendor/viselect.mjs"], reason: "vendored file's inline comment citing an SO answer" },
  ];

  const reached = walkPageLoadedFiles();
  // A regression guard on the walk itself: if the html/import parsing ever
  // stops matching (a markup change, a regex miss), `reached` would
  // silently shrink toward just the two entry points and the loop below
  // would trivially pass having checked almost nothing. Pin the previously
  // hardcoded set plus the files AUDIT-2026-08-16 named as missing, so a
  // walk that quietly regresses fails loudly here instead.
  for (const known of [
    "app.js", "index.html", "holon.js", "constitution.js", "fold.js", "source.js",
    "cite.js", "grounding.js", "tables.js", "artifact.js", "reflex.js", "editor.js",
    "build-log.js", "explore.html", "explore/explore.css", "explore/explore.js",
    "explore/vendor/viselect.mjs", "web.js",
  ])
    assert.ok(reached.has(known), `derived walk failed to reach previously-known file: ${known}`);

  const found = new Set(); // `${host}@${relPath}` pairs actually present
  for (const [relPath, url] of reached) {
    const src = readFileSync(url, "utf8");
    // `$` is excluded from the host capture too: a template literal like
    // `https://${s}` or `` `https://web.archive.org${cl}` `` (both real,
    // in web.js) must not let the interpolation swallow into the "host".
    const hosts = [...new Set([...src.matchAll(/https?:\/\/([^/"'` )>$]+)/g)].map((m) => m[1]))];
    for (const h of hosts) {
      if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(h)) continue;
      found.add(`${h}@${relPath}`);
      const allowed = ALLOWANCES.some((a) => a.host === h && a.files.includes(relPath));
      assert.ok(allowed, `non-local host in ${relPath}: ${h} (no declared allowance for this file)`);
    }
  }
  for (const a of ALLOWANCES)
    for (const f of a.files)
      assert.ok(found.has(`${a.host}@${f}`), `declared allowance ${a.host}@${f} (${a.reason}) was not found — stale, remove it`);
});

test("III.3 / IV.3 absent: every kind of gap is typed, never silent", () => {
  assert.deepEqual(openQuestions("zeppelin cargo", [], []), ["no material matched: zeppelin cargo"]);
  assert.deepEqual(openQuestions("harbor", chunks, []), ["material retrieved but uncited: harbor"]);
  const degraded = parsePlan("not json", "the task");
  assert.equal(degraded.degraded, true);
});

test("IV.1 derive: retrieval is a deterministic function of the question's words", () => {
  const a = retrieve(chunks, "harbor figure", 3);
  const b = retrieve(chunks, "harbor figure", 3);
  assert.deepEqual(a.map((c) => c.ref), b.map((c) => c.ref));
  assert.ok(a.length > 0);
  assert.deepEqual(retrieve(chunks, "zeppelin", 3), []);
});

test("IV.5 registers: paraphrase discloses itself; the record is a separate block", () => {
  const summary = addWarrantRecord(
    { ...emptySummary(), topic: "ports", flow: "steady", entities: [], context: "" },
    buildWarrantRecord({ turn: 1, gist: "g", channels: ["cited"], refs: ["notes.txt#0-74"], unsupported: [], open: [] }),
  );
  const s1 = buildSummarySystemMessage(summary);
  const s2 = buildRecordSystemMessage(summary);
  assert.ok(s1 && s2 && s1 !== s2, "two blocks, never merged");
  assert.ok(/paraphrase/i.test(s1), "the paraphrase block must disclaim itself");
  assert.ok(s2.includes("notes.txt#0-74"), "the record block carries the addresses");
});
