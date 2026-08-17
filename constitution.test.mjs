// constitution.test.mjs — the assay. Walks constitution.js's enforcement map
// and probes each row's actual behavior with the real organs, so "the app
// follows its constitution" is a test run rather than an assertion (VI.1:
// an article is a failing test or it is an exception). The unwired list is
// tested too — VI.3 only works if unwired stays visible.

import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import {
  CONSTITUTION_PROMPT,
  ENFORCEMENT,
  enforcedArticles,
  unwiredArticles,
} from "./constitution.js";
import { MOUNTS, VENDOR, diskReader, hostsIn, isLocalAuthority, pageGraph, servedLocally } from "./page-graph.mjs";
import { SEVERED } from "./term.js";
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

// ── II.13 / P1: the scan set is derived, not listed ─────────────────────────
//
// P1 claims "no non-localhost host in ANY file the page loads". That claim
// used to be carried by the hand-written array below — 17 filenames, missing
// thirteen modules the page loads today (render.js, log-pane.js, web.js,
// quotes.js and the rest), so the invariant was false in its own letter and
// went staler with every module added. The scan set is now WALKED from
// index.html by page-graph.mjs; the old array survives only as the floor the
// walk must clear.
const ROOT = fileURLToPath(new URL("./", import.meta.url));
const read = diskReader(ROOT);
const PAGE = pageGraph({ entry: "index.html", read });

const PREVIOUSLY_SCANNED = [
  "app.js", "index.html", "holon.js", "constitution.js", "fold.js", "source.js", "cite.js",
  "grounding.js", "tables.js", "artifact.js", "reflex.js", "editor.js", "build-log.js",
  "term.js", "term-js-worker.mjs", "term-py-worker.mjs", "term-sql-worker.js",
];

// The egress verbs, read from term.js so the vocabulary is ONE list: what the
// terminal severs in its workers is what counts as "this file can make a
// request" here. Call-shaped on purpose — web.js says the word "fetch" three
// times in prose about what it never does.
function egressCalls(src) {
  const hits = [];
  for (const verb of SEVERED) {
    if (new RegExp(`\\b(?:new\\s+)?${verb}\\s*\\(`).test(src)) hits.push(`${verb}(`);
    if (new RegExp(`\\b${verb}\\s*\\.\\s*\\w+\\s*\\(`).test(src)) hits.push(`${verb}.`);
  }
  if (/\bimport\s*\(/.test(src)) hits.push("import()");
  return hits;
}

// Typed allowances. A non-local host literal that is NOT a request — each one
// carrying the mechanical reason it cannot become one, CHECKED here rather
// than waived. An allowance whose reason stops holding fails this test.
const ALLOWANCES = [
  {
    host: "www.w3.org",
    files: null,
    why: "the SVG/XML namespace identifier — an XML name, never dereferenced by a browser",
    holds: (file, src, at) =>
      /xmlns(?::[a-z]+)?\s*=\s*["']?$/.test(src.slice(Math.max(0, at - 40), at)) ||
      /createElementNS\(\s*["']$/.test(src.slice(Math.max(0, at - 40), at)),
  },
  {
    host: null, // hostOf builds an authority from user input; there is no literal to name
    files: ["web.js", "links.js"],
    why:
      "P13: web.js is the PURE half of the web organ — it names archive addresses and parses " +
      "typed ones; the egress lives in explore-server.mjs. links.js is the same split for the " +
      "link-citation tier — its doc comments name example addresses (x.org, real/fake.example) " +
      "to explain the verdicts; the fetch that checks a real one is injected from app.js. " +
      "Checked, not asserted: neither file holds an egress call at all, so nothing in either " +
      "can issue a request.",
    holds: (file, src) => egressCalls(src).length === 0,
  },
];

test("II.13 local: no host but localhost appears anywhere the page can reach", () => {
  assert.ok(PAGE.files.length > PREVIOUSLY_SCANNED.length, "the walk returned no more than the list it replaces");
  for (const file of PAGE.files) {
    const src = read(file);
    for (const h of hostsIn(src)) {
      if (isLocalAuthority(h)) continue;
      const allowance = ALLOWANCES.find(
        (a) => (a.files ? a.files.includes(file) : true) && (a.host ? a.host === h.host : true) && a.holds(file, src, h.at),
      );
      assert.ok(allowance, `non-local host in ${file}: ${h.raw}`);
    }
  }
  // Remote load edges are the failure this exists to catch, in any file the
  // walk reached: an `import "https://cdn…"` anywhere in the graph.
  assert.deepEqual(PAGE.remote, [], "a page module loads from a non-local host");
  assert.deepEqual(PAGE.missing, [], "the page states a load edge that resolves to nothing");
});

test("II.13 local: the scan set is DERIVED from the page, and covers the list it replaced", () => {
  for (const file of PREVIOUSLY_SCANNED)
    assert.ok(PAGE.files.includes(file), `the derived scan set lost ${file}, which the old hardcoded list covered`);
  const newly = PAGE.files.filter((f) => !PREVIOUSLY_SCANNED.includes(f));
  assert.ok(newly.length > 0, "a derivation that covers only the old list is the old list");
  console.log(`II.13 scan set: ${PAGE.files.length} files walked from index.html; ${newly.length} beyond the old list — ${newly.join(", ")}`);

  // Closure, checked independently of the walker's own extractor: every
  // relative module path named in a scanned file must itself be scanned.
  for (const file of PAGE.files) {
    for (const m of read(file).matchAll(/["'](\.{1,2}\/[A-Za-z0-9_@./-]+\.(?:js|mjs))["']/g)) {
      const target = m[1].replace(/^\.\//, "");
      if (read(target) != null) assert.ok(PAGE.files.includes(target), `${file} names ${m[1]}, which the walk never scanned`);
    }
  }

  // What is deliberately NOT scanned is typed and resolves on this machine —
  // a mount or a vendored path is out of scope because another repo (or a
  // vendor) owns those bytes, never because the page fetches them remotely.
  assert.ok(PAGE.external.length > 0, "the engine mounts vanished from the page's imports");
  for (const e of PAGE.external) {
    assert.ok(MOUNTS.some((m) => m.prefix === e.mount), `undeclared mount in ${e.from}: ${e.spec}`);
    assert.ok(servedLocally(e, ROOT), `mounted import ${e.spec} resolves to nothing on this machine`);
  }
  assert.ok(PAGE.vendored.length > 0, "the vendored runtimes vanished from the page");
  for (const v of PAGE.vendored) {
    assert.ok(v.spec.startsWith(VENDOR.prefix), `undeclared vendor path in ${v.from}: ${v.spec}`);
    assert.ok(servedLocally(v, ROOT), `${v.spec} is not on this disk — a vendored path that is not vendored is a CDN`);
  }
  // Separate documents (the Explore iframe) are their own graph, scanned by
  // web.test.mjs's seam test; they are named here, never silently dropped.
  for (const d of PAGE.documents) assert.ok(isLocalAuthority(hostsIn(d.spec)[0] ?? { host: "", dynamic: false }), `embedded document from a non-local host: ${d.spec}`);
  assert.deepEqual(PAGE.bare, [], "a bare specifier cannot resolve in a browser without an import map");
});

test("II.13 local: the derivation cannot pass vacuously", () => {
  // The walk against a synthetic page whose answer is known — so a walker
  // that silently returns nothing (or stops following one kind of edge) is a
  // failing test here rather than a clean sweep over there.
  const FIXTURE = {
    "page.html":
      `<link rel="stylesheet" href="look.css" />\n` +
      `<script src="/node_modules/vendorlib/loader.js"></script>\n` +
      `<script type="module" src="./boot.js"></script>\n` +
      `<script type="module" src="side.js"></script>\n` +
      `<iframe src="http://localhost:9/other.html"></iframe>`,
    "boot.js":
      `import { a } from "./organ.js";\nimport { b } from "/engine/x.js";\n` +
      `const ROSTER = { js: { src: "./hand-worker.mjs" } };\n` +
      `new Worker(new URL(ROSTER.js.src, import.meta.url), { type: "module" });`,
    "side.js": `import "./evil.js";\nexport const x = 1;`,
    "evil.js": `import "https://cdn.example.com/x.js";`,
    "organ.js": `import { c } from "./deep.js";\nconst lazy = () => import("./lazy.js");`,
    "deep.js": `// leaf`,
    "lazy.js": `// leaf`,
    "hand-worker.mjs": `importScripts("/node_modules/vendorlib/sql.js");`,
    "look.css": `@import "./more.css";`,
    "more.css": `/* leaf */`,
  };
  const g = pageGraph({ entry: "page.html", read: (p) => FIXTURE[p] ?? null });
  assert.deepEqual(
    [...g.files].sort(),
    ["boot.js", "deep.js", "evil.js", "hand-worker.mjs", "lazy.js", "look.css", "more.css", "organ.js", "page.html", "side.js"],
    "the walk missed an edge kind — script src, relative import, dynamic import, a worker path held as data, importScripts, or a stylesheet",
  );
  assert.deepEqual(g.remote.map((e) => e.host), ["cdn.example.com"], "a remote import must be caught, wherever in the graph it sits");
  assert.deepEqual(g.external.map((e) => e.spec), ["/engine/x.js"]);
  assert.deepEqual(g.vendored.map((e) => e.spec), ["/node_modules/vendorlib/loader.js", "/node_modules/vendorlib/sql.js"]);
  assert.deepEqual(g.documents.map((e) => e.spec), ["http://localhost:9/other.html"]);

  // And the degenerate case is detectable rather than silent: a walk that
  // reads nothing reports the entry as missing and scans no file at all.
  const empty = pageGraph({ entry: "page.html", read: () => null });
  assert.deepEqual(empty.files, []);
  assert.equal(empty.missing.length, 1);
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
