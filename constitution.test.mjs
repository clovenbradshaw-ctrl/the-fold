// constitution.test.mjs — the assay. Walks constitution.js's enforcement map
// and probes each row's actual behavior with the real organs, so "the app
// follows its constitution" is a test run rather than an assertion (VI.1:
// an article is a failing test or it is an exception). The unwired list is
// tested too — VI.3 only works if unwired stays visible.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

test("II.13 local: no host but localhost appears anywhere the page can reach", () => {
  for (const file of ["app.js", "index.html", "holon.js", "constitution.js", "fold.js", "source.js", "cite.js", "grounding.js", "tables.js", "artifact.js", "reflex.js", "editor.js"]) {
    const src = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
    const hosts = [...src.matchAll(/https?:\/\/([^/"'` )>]+)/g)].map((m) => m[1]);
    for (const h of hosts)
      assert.ok(
        // www.w3.org appears only inside SVG xmlns attributes — a namespace
        // identifier the browser never fetches, not a request.
        /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(h) || h === "www.w3.org",
        `non-local host in ${file}: ${h}`,
      );
  }
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
