// priors.test.mjs — the reference-library tier's pure half, tested against a
// REAL corpus document. The fixture is eval/fixtures/ukpga-2017-1.md, copied
// byte-identical (sha256 a2fa6dab64508c6e…) on 2026-08-17 from
// live_priors/06-government-legal/world-legislation/uk/ukpga-2017-1.md — the
// Small Charitable Donations and Childcare Payments Act 2017 as published by
// the Statute Law Database (official URL legislation.gov.uk, carried in the
// file's own frontmatter), read via the legalize.dev mirror the corpus
// documents in its SOURCES.md. The provenance frontmatter travels with the
// copy untouched; that is the point of the fixture.
//
// No IO beyond reading the fixture; the directory walk and the route live in
// explore-server.mjs and are exercised there.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  PRIORS_DOCS_CONSULTED,
  PRIORS_SNIPS_KEPT,
  REFERENCE_LADDER,
  parseFrontmatter,
  categoryOf,
  provenanceOf,
  readPriorDocument,
  checkPrior,
  categoryLadderFor,
  rankPriorCandidates,
  foldPriors,
} from "./priors.js";
import { PRIMARY_SNIPS_KEPT } from "./primary.js";

const FIXTURE_PATH = "06-government-legal/world-legislation/uk/ukpga-2017-1.md";
const FIXTURE = readFileSync(new URL("eval/fixtures/ukpga-2017-1.md", import.meta.url), "utf8");

// ── declared numbers name their givers ──────────────────────────────────────
test("the declared bounds carry their givers, not fresh constants", () => {
  assert.ok(Number.isInteger(PRIORS_DOCS_CONSULTED) && PRIORS_DOCS_CONSULTED > 0);
  // the snip cap's giver is primary.js's own declared bound
  assert.equal(PRIORS_SNIPS_KEPT, PRIMARY_SNIPS_KEPT);
});

// ── frontmatter: the fenced face, on the real file ──────────────────────────
test("parseFrontmatter reads the statute's fenced provenance and carries the offset", () => {
  const { meta, offset, title } = parseFrontmatter(FIXTURE);
  assert.equal(title, "Small Charitable Donations and Childcare Payments Act 2017");
  assert.equal(meta.source, "https://www.legislation.gov.uk/ukpga/2017/1");
  assert.equal(meta.department, "Statute Law Database");
  assert.equal(meta.publication_date, "2017-01-16");
  assert.equal(meta.status, "in_force");
  // the offset shift is carried: the body starts exactly where the fence ends
  assert.ok(offset > 0);
  assert.ok(FIXTURE.slice(offset).startsWith("# Small Charitable Donations"));
  // and no frontmatter line survives into the body
  assert.ok(!FIXTURE.slice(offset).includes("publication_date:"));
});

// ── frontmatter: the unfenced face the corpus's .txt files write ────────────
test("parseFrontmatter reads the unfenced header block (world-factbook's own shape)", () => {
  // The first lines of live_priors/06-government-legal/world-factbook/
  // africa_ag.txt, quoted here as the shape's origin (US federal work,
  // public domain per the file's own Publisher line):
  const raw = [
    "The World Factbook — Algeria",
    "Region: africa",
    "GEC code: ag",
    "Publisher: Central Intelligence Agency (public domain)",
    "",
    "## Introduction",
    "",
    "Algeria has known many empires and dynasties.",
  ].join("\n");
  const { meta, offset, title } = parseFrontmatter(raw);
  assert.equal(title, "The World Factbook — Algeria");
  assert.equal(meta.Publisher, "Central Intelligence Agency (public domain)");
  assert.equal(meta.Region, "africa");
  assert.ok(raw.slice(offset).startsWith("## Introduction"));
  // the canonical alias fills from the corpus's own key name, case-insensitively
  assert.equal(provenanceOf(meta).publisher, "Central Intelligence Agency (public domain)");
});

test("a prose opening is never mistaken for provenance; an unclosed fence is not a header", () => {
  const prose = "Punda dignidade di tudo nguê di mundu\ne dirêtu d'inem igual sá stê di liberdade.\n\nSecond paragraph.";
  assert.deepEqual(parseFrontmatter(prose), { meta: {}, offset: 0, title: null });
  const unclosed = "---\ntitle: never closed\nbody keeps going with no second fence";
  assert.equal(parseFrontmatter(unclosed).offset, 0);
});

// ── category extraction ─────────────────────────────────────────────────────
test("categoryOf is the corpus's own top-level directory name", () => {
  assert.equal(categoryOf(FIXTURE_PATH), "06-government-legal");
  assert.equal(categoryOf("01-literature-books/gutenberg/treasure-island.txt"), "01-literature-books");
  assert.equal(categoryOf(""), null);
});

// ── the loader, and provenance passthrough ──────────────────────────────────
test("readPriorDocument: body stripped, offset composed, provenance passed through untouched", () => {
  const doc = readPriorDocument(FIXTURE_PATH, FIXTURE);
  assert.equal(doc.path, FIXTURE_PATH);
  assert.equal(doc.category, "06-government-legal");
  assert.equal(doc.text, FIXTURE.slice(doc.offset));
  // THE PROVENANCE RULE: the official URL survives to the result byte-for-byte,
  // both under the file's own key and under the canonical alias
  assert.equal(doc.source.source, "https://www.legislation.gov.uk/ukpga/2017/1");
  assert.equal(doc.source.url, "https://www.legislation.gov.uk/ukpga/2017/1");
  assert.equal(doc.source.publisher, "Statute Law Database");
  assert.equal(doc.source.date, "2017-01-16");
  // keys the mapper never learned still ride through, untouched
  assert.equal(doc.source.status, "in_force");
  assert.equal(doc.source.isbn, "9780105400639");
});

test("readPriorDocument composes the Gutenberg container strip with the header strip", () => {
  const raw =
    "Front matter about the ebook.\n\n*** START OF THE PROJECT GUTENBERG EBOOK TREASURE ISLAND ***\n\nSquire Trelawney kept the Kestrel at anchor.\n\n*** END OF THE PROJECT GUTENBERG EBOOK TREASURE ISLAND ***\nlicence prose";
  const doc = readPriorDocument("01-literature-books/gutenberg/treasure-island.txt", raw);
  assert.ok(!doc.text.includes("START OF THE PROJECT"));
  assert.ok(!doc.text.includes("licence prose"));
  const [snip] = checkPrior({ kind: "name", text: "Kestrel", tokens: ["Kestrel"] }, doc).snips;
  // the snip addresses the FILE, container skipped but never renumbered
  assert.equal(raw.slice(snip.start, snip.end), snip.text);
});

// ── the check: stated, unstated, self-verifying offsets ─────────────────────
const STATED = {
  kind: "name",
  text: "Small Charitable Donations Act 2012",
  tokens: ["Small", "Charitable", "Donations", "Act", "2012"],
  sentence: "The Small Charitable Donations Act 2012 sets up the payment scheme.",
};

test("a claim the statute states: stating, with verbatim snips that self-verify against the file", () => {
  const doc = readPriorDocument(FIXTURE_PATH, FIXTURE);
  const result = checkPrior(STATED, doc);
  assert.equal(result.stating, true);
  assert.ok(result.snipsFound >= 1);
  assert.equal(result.path, FIXTURE_PATH);
  assert.equal(result.category, "06-government-legal");
  for (const s of result.snips) {
    // P5.2 pinned: slicing the FIXTURE at [start, end) reproduces the snip
    assert.equal(FIXTURE.slice(s.start, s.end), s.text);
    // and the address is the file's, past the frontmatter, never the body's
    assert.ok(s.start >= doc.offset);
  }
  // the provenance rides the result, url untouched
  assert.equal(result.source.url, "https://www.legislation.gov.uk/ukpga/2017/1");
});

test("a figure the statute states is found through the same walk", () => {
  const doc = readPriorDocument(FIXTURE_PATH, FIXTURE);
  const result = checkPrior({ kind: "number", text: "2013", tokens: ["2013"], sentence: "" }, doc);
  assert.equal(result.stating, true);
  for (const s of result.snips) assert.equal(FIXTURE.slice(s.start, s.end), s.text);
});

test("a claim the statute never states is an empty result, not an error", () => {
  const doc = readPriorDocument(FIXTURE_PATH, FIXTURE);
  const result = checkPrior({ kind: "name", text: "Battle of Borodino", tokens: ["Battle", "Borodino"] }, doc);
  assert.deepEqual({ stating: result.stating, snips: result.snips, snipsFound: result.snipsFound }, { stating: false, snips: [], snipsFound: 0 });
});

test("snips are capped at the declared bound with the true count stated", () => {
  const body = Array.from({ length: PRIORS_SNIPS_KEPT + 3 }, (_, i) => `Sentence ${i} names the Kestrel plainly.`).join("\n\n");
  const doc = readPriorDocument("02-encyclopedic/wikipedia/Kestrel.txt", body);
  const result = checkPrior({ kind: "name", text: "Kestrel", tokens: ["Kestrel"] }, doc);
  assert.equal(result.snipsFound, PRIORS_SNIPS_KEPT + 3);
  assert.equal(result.snips.length, PRIORS_SNIPS_KEPT);
});

// ── candidate selection ─────────────────────────────────────────────────────
test("candidates order by overlap count first, ladder second, path third; no-overlap entries are absent", () => {
  const claim = { kind: "name", text: "Napoleon", tokens: ["Napoleon"], sentence: "Napoleon invaded Russia in 1812." };
  const entries = [
    { path: "01-literature-books/gutenberg/war-and-peace.txt", title: "War and Peace" },
    { path: "01-literature-books/gutenberg/napoleon-memoirs.txt", title: "Memoirs of Napoleon" },
    { path: "02-encyclopedic/wikipedia/Napoleon.txt", title: "Napoleon" },
    { path: "06-government-legal/world-factbook/europe_fr.txt", title: "The World Factbook — France" },
    { path: "14-holy-texts/wlc-tanakh/genesis.txt", title: "Genesis" },
  ];
  const ranked = rankPriorCandidates(claim, entries);
  // war-and-peace, factbook france and genesis share no claim word — absent, not last
  assert.deepEqual(
    ranked.map((r) => r.path),
    ["02-encyclopedic/wikipedia/Napoleon.txt", "01-literature-books/gutenberg/napoleon-memoirs.txt"],
  );
  // equal overlap fell to the ladder: encyclopedic before literature
  assert.equal(ranked[0].category, "02-encyclopedic");
  assert.ok(ranked.every((r) => r.overlap > 0));
});

test("the ladder is an ordering the claim's nature declares — reference shelves before literature", () => {
  const ladder = categoryLadderFor({ kind: "number" });
  assert.equal(ladder, REFERENCE_LADDER);
  assert.ok(ladder.indexOf("02-encyclopedic") < ladder.indexOf("01-literature-books"));
  assert.ok(ladder.indexOf("06-government-legal") < ladder.indexOf("01-literature-books"));
});

test("a category the ladder never named falls after it by path order, never excluded", () => {
  const claim = { kind: "name", text: "Kestrel", tokens: ["Kestrel"] };
  const ranked = rankPriorCandidates(claim, [
    { path: "99-new-shelf/kestrel-notes.txt", title: "Kestrel notes" },
    { path: "02-encyclopedic/wikipedia/Kestrel.txt", title: "Kestrel" },
  ]);
  assert.deepEqual(
    ranked.map((r) => r.path),
    ["02-encyclopedic/wikipedia/Kestrel.txt", "99-new-shelf/kestrel-notes.txt"],
  );
});

// ── the fold ────────────────────────────────────────────────────────────────
test("foldPriors counts, types its verdicts, and never phrases stronger than the count", () => {
  const doc = readPriorDocument(FIXTURE_PATH, FIXTURE);
  const stating = checkPrior(STATED, doc);
  const silent = checkPrior({ kind: "name", text: "Borodino", tokens: ["Borodino"] }, doc);

  const some = foldPriors(STATED, { candidates: 5, documents: [stating, silent] });
  assert.equal(some.verdict, "stated-by-library");
  assert.equal(some.consulted, 2);
  assert.equal(some.stating, 1);
  assert.equal(some.candidates, 5);
  assert.match(some.sentence, /1 of 2 document\(s\) consulted state it/);
  // every document in the payload carries its provenance — the rule itself
  for (const d of some.documents) assert.equal(d.source.url, "https://www.legislation.gov.uk/ukpga/2017/1");

  const none = foldPriors(STATED, { candidates: 1, documents: [silent] });
  assert.equal(none.verdict, "unstated-by-consulted");
  assert.match(none.sentence, /a result, never a refutation/);

  const empty = foldPriors(STATED, {});
  assert.equal(empty.verdict, "no-candidates");
  assert.equal(empty.consulted, 0);
  assert.match(empty.sentence, /a gap in the shelf, not a verdict/);
  assert.match(empty.sentence, /no document's name or title shares the claim's words/);

  for (const f of [some, none, empty]) assert.ok(!/\btrue\b|confirm/i.test(f.sentence), f.sentence);
});

test("a gapped document is inherited, never derived through — it does not count as consulted", () => {
  const doc = readPriorDocument(FIXTURE_PATH, FIXTURE);
  const stating = checkPrior(STATED, doc);
  const gapped = { path: "06-government-legal/world-legislation/xx/moved.md", category: "06-government-legal", title: null, stating: false, snipsFound: 0, snips: [], source: {}, gap: { silence: "not-present", detail: "ENOENT" } };

  // every candidate attempted gapped: not-consulted, never "unstated"
  const allGapped = foldPriors(STATED, { candidates: 3, documents: [gapped, gapped] });
  assert.equal(allGapped.verdict, "not-consulted");
  assert.equal(allGapped.consulted, 0);
  assert.equal(allGapped.failed, 2);
  assert.match(allGapped.sentence, /a gap, not a verdict/);
  assert.doesNotMatch(allGapped.sentence, /0 of 2 document/);

  // a gap beside a real read: the gap is counted separately, not folded into "consulted"
  const mixed = foldPriors(STATED, { candidates: 2, documents: [stating, gapped] });
  assert.equal(mixed.verdict, "stated-by-library");
  assert.equal(mixed.consulted, 1);
  assert.equal(mixed.failed, 1);
  assert.match(mixed.sentence, /1 of 1 document\(s\) consulted state it/);
  assert.match(mixed.sentence, /1 could not be read, counted separately/);
});

test("independence counts distinct WORKS, not documents — same-title copies count once", () => {
  const doc = readPriorDocument(FIXTURE_PATH, FIXTURE);
  const a = checkPrior(STATED, doc);
  // a second "document" that states the claim under the SAME title — a
  // stand-in for the corpus's own same-work flooding (516 UDHR translations,
  // one title)
  const b = { ...checkPrior(STATED, doc), path: "06-government-legal/world-legislation/xx/copy.md" };
  const folded = foldPriors(STATED, { candidates: 2, documents: [a, b] });
  assert.equal(folded.stating, 2);
  assert.equal(folded.independence.works, 1);
  assert.match(folded.sentence, /1 distinct work\(s\)/);
  assert.match(folded.independence.basis, /not tested/);
});
