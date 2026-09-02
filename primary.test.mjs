// primary.test.mjs — the primary-source walk's pure half, tested offline
// against captured bytes. The fixture is a REAL Wikipedia article face:
// eval/fixtures/wikipedia-battle-of-borodino.html, the exact bytes the
// running explore server's /api/web/fetch saved on 2026-08-17 from
// https://en.wikipedia.org/wiki/Battle_of_Borodino (sha256 b02d7a4f…, the
// history rows in web/history.jsonl are the provenance) — promoted to a
// fixture rather than re-fetched, because the store already held the page.
// The network is never touched here; the egress half lives in
// explore-server.mjs (/api/web/primary) under P13.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  PRIMARY_SOURCES_CONSULTED,
  PRIMARY_SNIPS_KEPT,
  PRIMARY_CLASSES,
  isWikiFamilyHost,
  isWikipediaHost,
  unwrapArchiveUrl,
  extractCitations,
  classifyCitation,
  rankPrimary,
  snipClaim,
  foldPrimary,
} from "./primary.js";
import { PROOF_PAGES_CONSULTED } from "./proof.js";
import { extractReadable } from "./web.js";

const FIXTURE = readFileSync(new URL("../eoreader7/native/eval/the-fold/fixtures/wikipedia-battle-of-borodino.html", import.meta.url), "utf8");

// ── declared numbers name their givers ──────────────────────────────────────
test("the consult bound's giver is proof.js's own declared bound, not a new constant", () => {
  assert.equal(PRIMARY_SOURCES_CONSULTED, PROOF_PAGES_CONSULTED);
  assert.ok(PRIMARY_SNIPS_KEPT > 0);
});

// ── archive wrappers ────────────────────────────────────────────────────────
test("unwrapArchiveUrl keeps BOTH faces: the target and the archive form", () => {
  const u = unwrapArchiveUrl("https://web.archive.org/web/20190417042006/https://www.thoughtco.com/tchaikovskys-1812-overture-724401");
  assert.equal(u.target, "https://www.thoughtco.com/tchaikovskys-1812-overture-724401");
  assert.ok(u.archive.startsWith("https://web.archive.org/web/20190417042006/"));
  // timestamp modifiers (id_, if_) are part of the wrapper, not the target
  const m = unwrapArchiveUrl("http://web.archive.org/web/2020id_/http://example.org/x");
  assert.equal(m.target, "http://example.org/x");
  // not a wrapper: archive.org's own collections are a real destination
  assert.equal(unwrapArchiveUrl("https://archive.org/details/war00dyer"), null);
  assert.equal(unwrapArchiveUrl("https://example.com/web/2020/https://x.com"), null);
});

test("the wiki family is navigation, not a source; wikipedia.org is the chaining seam", () => {
  for (const h of ["en.wikipedia.org", "commons.wikimedia.org", "www.wikidata.org", "de.wikisource.org", "wikimediafoundation.org", "www.mediawiki.org"]) {
    assert.ok(isWikiFamilyHost(h), h);
  }
  assert.ok(!isWikiFamilyHost("borodino.ru"));
  assert.ok(!isWikiFamilyHost("wikipedia.org.evil.com"));
  assert.ok(isWikipediaHost("en.wikipedia.org"));
  assert.ok(!isWikipediaHost("commons.wikimedia.org"));
});

// ── citation extraction on the real bytes ───────────────────────────────────
test("extractCitations reads the Borodino article's outbound citations from the raw face", () => {
  const cites = extractCitations(FIXTURE);
  // the article carries ~50 external anchors; dedup leaves dozens of
  // candidates — an order-of-magnitude pin, not a byte-count one
  assert.ok(cites.length >= 40 && cites.length <= 60, `found ${cites.length}`);
  // no wiki-internal or family link survives as a candidate
  for (const c of cites) {
    assert.ok(/^https?:\/\//.test(c.url), c.url);
    assert.ok(!isWikiFamilyHost(c.host), `family leak: ${c.host}`);
  }
  // document order is the article's own ordering, kept as the index
  for (let i = 1; i < cites.length; i++) assert.ok(cites[i].index > cites[i - 1].index);
  // a CS1 bibliography entry carries its visible citation text
  const doi = cites.find((c) => c.host === "doi.org");
  assert.ok(doi, "the article's DOI citation was not found");
  assert.ok(/Kuehn/.test(doi.text), doi.text);
  // the archived-and-bare pair merged into ONE candidate holding both faces
  const thought = cites.filter((c) => c.host === "thoughtco.com");
  assert.equal(thought.length, 1);
  assert.equal(thought[0].url, "https://www.thoughtco.com/tchaikovskys-1812-overture-724401");
  assert.ok(/^https:\/\/web\.archive\.org\/web\/\d+\//.test(thought[0].archiveUrl));
  // a footnote citation's text does not keep the backlink digits as words
  const pdf = cites.find((c) => c.host === "borodino.ru");
  assert.ok(pdf && /Tselorungo/.test(pdf.text), pdf?.text);
  assert.ok(!/^[\d\s↑]+/.test(pdf.text), `backlink chrome leaked: ${pdf.text.slice(0, 30)}`);
});

test("extractCitations walks quoted attribute values — data-mw JSON holding '>' does not break the anchor walk", () => {
  const html = `<ol><li id="cite_note-1"><span class="mw-cite-backlink"><a href="#c">↑ 1 2</a></span>
    <span class="reference-text"><cite class="citation web" data-mw='{"a":"1>2"}'>Doe, J. (1974).
    "The Report" <a rel="mw:ExtLink" href="https://records.example.gov/report?a=1&amp;b=2" data-x='{">":1}'>source</a>.</cite></span></li></ol>`;
  const cites = extractCitations(html);
  assert.equal(cites.length, 1);
  assert.equal(cites[0].url, "https://records.example.gov/report?a=1&b=2"); // entity-decoded href
  assert.ok(/Doe, J\. \(1974\)/.test(cites[0].text), cites[0].text);
  assert.ok(!/↑|1 2/.test(cites[0].text.slice(0, 10)), cites[0].text);
});

// ── the class ladder ────────────────────────────────────────────────────────
test("classifyCitation: a declared ordering of named classes, first match wins, no weights anywhere", () => {
  assert.equal(classifyCitation({ url: "https://catalog.archives.gov/id/123", host: "catalog.archives.gov" }), "government");
  assert.equal(classifyCitation({ url: "https://www.nationalarchives.gov.uk/x", host: "nationalarchives.gov.uk" }), "government");
  assert.equal(classifyCitation({ url: "https://muse.jhu.edu/article/251445", host: "muse.jhu.edu" }), "academic");
  assert.equal(classifyCitation({ url: "https://doi.org/10.1353/jmh.0.0141", host: "doi.org" }), "identifier");
  assert.equal(classifyCitation({ url: "https://archive.org/details/war00dyer", host: "archive.org" }), "archive-library-museum");
  assert.equal(classifyCitation({ url: "https://www.borodino.ru/up/TSelorungo.pdf", host: "borodino.ru" }), "pdf-document");
  assert.equal(classifyCitation({ url: "https://news.example.com/story", host: "news.example.com", text: "Smith (1998). The Story." }), "dated-document");
  assert.equal(classifyCitation({ url: "https://news.example.com/story", host: "news.example.com", text: "a bare link" }), "other");
  // a .gov PDF is government — the ladder is an order, and host class comes first
  assert.equal(classifyCitation({ url: "https://records.example.gov/x.pdf", host: "records.example.gov" }), "government");
  assert.deepEqual(PRIMARY_CLASSES, ["government", "academic", "identifier", "archive-library-museum", "pdf-document", "dated-document", "other"]);
});

// ── ranking: lexicographic, no invented constant ────────────────────────────
test("rankPrimary puts the claim-relevant primary candidate first on the real bytes", () => {
  const cites = extractCitations(FIXTURE);
  const claim = {
    kind: "name",
    text: "Kuehn",
    tokens: ["Kuehn"],
    sentence: "John Kuehn reviewed The Battle of Borodino: Napoleon Against Kutuzov in the Journal of Military History",
  };
  const ranked = rankPrimary(claim, cites);
  assert.equal(ranked.length, cites.length); // ordering, never a filter — a zero-overlap candidate is ranked, not dropped
  // the four candidates sharing the Kuehn citation text tie on overlap;
  // the class ladder decides among them: academic (muse.jhu.edu) ahead of
  // the identifier and library forms of the same work
  assert.equal(ranked[0].host, "muse.jhu.edu");
  assert.equal(ranked[0].structuralClass, "academic");
  assert.equal(ranked[1].host, "doi.org");
  assert.ok(ranked[0].overlap === ranked[1].overlap && ranked[0].overlap > 0);
});

test("rankPrimary ties fall to the article's own citation order, and an empty claim changes nothing but the key", () => {
  const cands = [
    { url: "https://b.example.com/2", host: "b.example.com", text: "no year here", index: 0 },
    { url: "https://a.example.com/1", host: "a.example.com", text: "also none", index: 1 },
  ];
  const ranked = rankPrimary({ kind: "name", text: "", tokens: [], sentence: "" }, cands);
  // equal overlap (0), equal class (other) — document order holds
  assert.deepEqual(ranked.map((r) => r.host), ["b.example.com", "a.example.com"]);
});

test("rankPrimary counts overlap through the one shared fold — accents on either side do not break the count", () => {
  const cands = [
    { url: "https://x.example.com/a", host: "x.example.com", text: "Bagratión commanded the flèches", index: 0 },
    { url: "https://y.example.com/b", host: "y.example.com", text: "unrelated words entirely", index: 1 },
  ];
  const ranked = rankPrimary({ kind: "name", text: "Bagration", tokens: ["Bagration"], sentence: "Bagration commanded" }, cands);
  assert.equal(ranked[0].host, "x.example.com");
  assert.ok(ranked[0].overlap > ranked[1].overlap);
});

// ── the snip ────────────────────────────────────────────────────────────────
test("snipClaim: verbatim passages whose offsets self-verify against the face (P5.2)", () => {
  const face = extractReadable(FIXTURE).text; // the same face the fetch route saves
  const snips = snipClaim(
    { kind: "name", text: "Kutuzov", tokens: ["Kutuzov"], sentence: "" },
    face,
    { facePath: "the-fold/web/pages/b02d7a4f9c4d1e63.txt", url: "https://en.wikipedia.org/wiki/Battle_of_Borodino", host: "en.wikipedia.org" },
  );
  assert.ok(snips.length > 5, `found ${snips.length}`);
  for (const s of snips) {
    assert.equal(face.slice(s.start, s.end), s.text); // the address reproduces its text or it does not ship
    assert.ok(/kutuzov/i.test(s.text.normalize("NFD").replace(/\p{M}/gu, "")), s.text.slice(0, 60));
    assert.equal(s.facePath, "the-fold/web/pages/b02d7a4f9c4d1e63.txt");
    assert.equal(s.host, "en.wikipedia.org");
  }
});

test("snipClaim judges figures by number containment and names through the fold, both sides folded", () => {
  const face = "The corps counted 45,000 men at dawn.\nBagratión fell at the flèches.\nNothing else happened.";
  const n = snipClaim({ kind: "number", text: "45,000", tokens: ["45000"] }, face, {});
  assert.equal(n.length, 1);
  assert.equal(face.slice(n[0].start, n[0].end), n[0].text);
  assert.ok(n[0].text.includes("45,000"));
  // the claim's plain form finds the face's accented bytes — P11's one fold
  const b = snipClaim({ kind: "name", text: "Bagration", tokens: ["Bagration"] }, face, {});
  assert.equal(b.length, 1);
  assert.ok(b[0].text.includes("Bagratión"));
});

test("a source that never states the claim returns an empty snip list — a result, not an error (P4)", () => {
  const face = extractReadable(FIXTURE).text;
  assert.deepEqual(snipClaim({ kind: "name", text: "Zanzibar", tokens: ["Zanzibar"], sentence: "" }, face, {}), []);
  assert.deepEqual(snipClaim({ kind: "name", text: "x", tokens: [] }, "", {}), []);
});

// ── the fold ────────────────────────────────────────────────────────────────
test("foldPrimary phrases counted perspectives and never says true", () => {
  const claim = { kind: "name", text: "Kuehn" };
  const stated = foldPrimary(claim, {
    citationsFound: 49,
    consulted: [
      { url: "https://muse.jhu.edu/article/251445", host: "muse.jhu.edu", snipsFound: 2, snips: [{ text: "…", start: 0, end: 1 }] },
      { url: "https://a.example.com/x", host: "a.example.com", snipsFound: 0, snips: [] },
      { url: "https://b.example.com/y", host: "b.example.com", gap: { silence: "not-present", detail: "timed out" } },
    ],
  });
  assert.equal(stated.verdict, "stated-by-primary");
  assert.equal(stated.read, 2);
  assert.equal(stated.failed, 1);
  assert.deepEqual(stated.statingHosts, ["muse.jhu.edu"]);
  assert.ok(/49 outside source/.test(stated.sentence));
  assert.ok(/stated by 1/.test(stated.sentence));
  assert.ok(/counted separately/.test(stated.sentence));
  assert.ok(!/\btrue\b|\bconfirmed\b|\bverified\b/i.test(stated.sentence), stated.sentence);
  assert.ok(/not tested/.test(stated.independence.basis)); // the syndication-shaped residue stays named

  const unstated = foldPrimary(claim, {
    citationsFound: 3,
    consulted: [{ url: "https://a.example.com/x", host: "a.example.com", snipsFound: 0, snips: [] }],
  });
  assert.equal(unstated.verdict, "unstated-by-consulted");
  assert.ok(/result, not a refutation/.test(unstated.sentence), unstated.sentence);

  const gapOnly = foldPrimary(claim, {
    citationsFound: 3,
    consulted: [{ url: "https://a.example.com/x", host: "a.example.com", gap: { silence: "refused-upstream" } }],
  });
  assert.equal(gapOnly.verdict, "not-consulted");
  assert.ok(/gap, not a verdict/.test(gapOnly.sentence));

  assert.equal(foldPrimary(claim, { citationsFound: 0, consulted: [] }).verdict, "not-consulted");
});

// ── the seam ────────────────────────────────────────────────────────────────
test("seam: primary.js is the PURE half — no egress call, no non-local host literal", () => {
  const text = readFileSync(new URL("primary.js", import.meta.url), "utf8");
  // no fetch of any kind — the escaped web.archive.org pattern inside its
  // regex names no fetchable literal (the same allowance web.js earns: the
  // file holds no egress call at all)
  assert.ok(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|node:https?\b|node:net\b/.test(text), "primary.js grew an egress call");
  const hosts = [...text.matchAll(/https?:\/\/([^\s"'`/<)]+)/g)].map((m) => m[1]);
  assert.deepEqual(hosts, [], `primary.js names a fetchable host: ${hosts.join(", ")}`);
});
