// web.test.mjs — the web organ's pure half, tested offline. The network is
// never touched here (P13's egress lives in explore-server.mjs and is
// exercised by hand); these tests pin what the organ does to bytes it is
// GIVEN — extraction, search parsing including the bot-block refusal, the
// history fold, archive-address naming, and the browser-side seam: the
// Explore page itself still fetches nothing remote.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  normalizeUrl,
  hostOf,
  looksLikeChallenge,
  decodeEntities,
  extractReadable,
  parseSearchResults,
  unwrapDdgHref,
  foldWebHistory,
  archiveUrlFrom,
  extForContentType,
  WEB_FETCH_MAX_BYTES,
  WEB_SEARCH_MAX_RESULTS,
} from "./web.js";

// ── url hygiene ─────────────────────────────────────────────────────────────
test("normalizeUrl: http(s) only, bare domains get https, loopback refused", () => {
  assert.equal(normalizeUrl("example.com/a b"), null);
  assert.equal(normalizeUrl("example.com"), "https://example.com/");
  assert.equal(normalizeUrl("http://example.com/x?y=1"), "http://example.com/x?y=1");
  assert.equal(normalizeUrl("ftp://example.com"), null);
  assert.equal(normalizeUrl("javascript:alert(1)"), null);
  assert.equal(normalizeUrl("file:///etc/passwd"), null);
  assert.equal(normalizeUrl("localhost:8812"), null);
  assert.equal(normalizeUrl("http://127.0.0.1/x"), null);
  assert.equal(normalizeUrl("notadomain"), null);
  assert.equal(normalizeUrl(""), null);
});

test("hostOf drops www and survives non-urls", () => {
  assert.equal(hostOf("https://www.example.com/x"), "example.com");
  assert.equal(hostOf("nonsense"), "nonsense");
});

// ── extraction ──────────────────────────────────────────────────────────────
const PAGE = `<!doctype html><html lang="en"><head><title>The Harbor &amp; Its Figure</title>
<meta name="description" content="A page about the harbor."></head><body>
<header><nav><a href="/">Home</a><a href="/about">About</a></nav></header>
<script>var tracking = "never text";</script>
<style>.x { color: red }</style>
<main><h1>Harbor report</h1>
<p>The Kessington report put the harbor figure at 12% for the spring quarter.</p>
<p>Dredging of the shipping channel runs through March under the port authority schedule.</p>
<ul><li>first item</li><li>second &mdash; item</li></ul></main>
<aside>Related links you did not ask for</aside>
<footer>© 2026 Cookie banner Inc. Accept all?</footer>
</body></html>`;

test("extractReadable: title, description, whole readable text; chrome and code stripped (P5.3)", () => {
  const out = extractReadable(PAGE);
  assert.equal(out.title, "The Harbor & Its Figure");
  assert.equal(out.description, "A page about the harbor.");
  assert.equal(out.lang, "en");
  assert.ok(out.text.includes("harbor figure at 12%"));
  assert.ok(out.text.includes("Dredging of the shipping channel"));
  assert.ok(out.text.includes("- first item"));
  assert.ok(out.text.includes("- second — item"));
  // the container is boilerplate, not material
  assert.ok(!out.text.includes("never text"));
  assert.ok(!out.text.includes("color: red"));
  assert.ok(!out.text.includes("Cookie banner"));
  assert.ok(!out.text.includes("Related links"));
  assert.ok(!out.text.includes("About"));
  // ALL the readable content is kept — extraction is not a summary
  assert.ok(out.text.length > 100);
});

test("extractReadable: a truncated script takes its tail, a sloppy container does not", () => {
  const truncated = extractReadable(`<body><p>kept</p><script>var x = "lost`);
  assert.ok(truncated.text.includes("kept"));
  assert.ok(!truncated.text.includes("lost"));
  const sloppy = extractReadable(`<body><header>chrome<p>real content after an unclosed header`);
  assert.ok(sloppy.text.includes("real content"));
});

test("extractReadable on a real page keeps the article, drops the chrome", (t) => {
  let html;
  try {
    html = readFileSync(new URL("./eval/fixtures/wikipedia-war-and-peace.html", import.meta.url), "utf8");
  } catch {
    t.skip("fixture not present");
    return;
  }
  const out = extractReadable(html);
  assert.ok(/War and Peace/.test(out.title));
  assert.ok(out.text.includes("Tolstoy"));
  assert.ok(!/mw-parser|\{|function\s*\(/.test(out.text.slice(0, 4000)), "no code residue near the head");
  assert.ok(out.text.length > 10_000, "the whole article, not a summary");
});

// ── search parsing ──────────────────────────────────────────────────────────
const DDG_HTML = `<div class="results">
<div class="result results_links results_links_deep web-result">
<h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.gutenberg.org%2Febooks%2F2600&amp;rut=abc">War and <b>Peace</b> by Leo Tolstoy</a></h2>
<a class="result__snippet" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.gutenberg.org%2Febooks%2F2600&amp;rut=abc">Free ebook of <b>War and Peace</b>.</a>
</div>
<div class="result result--ad"><h2 class="result__title"><a rel="nofollow" class="result__a" href="https://duckduckgo.com/y.js?ad_domain=x">Sponsored</a></h2></div>
<div class="result"><h2><a class="result__a" href="https://en.wikipedia.org/wiki/War_and_Peace">War and Peace - Wikipedia</a></h2></div>
</div>`;

test("parseSearchResults: /html face — unwraps uddg, drops ads, keeps order", () => {
  const { blocked, results } = parseSearchResults(DDG_HTML);
  assert.equal(blocked, false);
  assert.equal(results.length, 2);
  assert.equal(results[0].url, "https://www.gutenberg.org/ebooks/2600");
  assert.equal(results[0].title, "War and Peace by Leo Tolstoy");
  assert.equal(results[0].snippet, "Free ebook of War and Peace.");
  assert.equal(results[1].url, "https://en.wikipedia.org/wiki/War_and_Peace");
});

const DDG_LITE = `<table><tr><td>1.&nbsp;</td><td><a rel="nofollow" href="https://example.com/a" class='result-link'>Example A</a></td></tr>
<tr><td>&nbsp;</td><td class='result-snippet'>Snippet for A</td></tr>
<tr><td>2.&nbsp;</td><td><a rel="nofollow" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fb" class='result-link'>Example B</a></td></tr>
<tr><td>&nbsp;</td><td class='result-snippet'>Snippet for B</td></tr></table>`;

test("parseSearchResults: /lite face pairs links with snippet cells", () => {
  const { blocked, results } = parseSearchResults(DDG_LITE);
  assert.equal(blocked, false);
  assert.equal(results.length, 2);
  assert.deepEqual(results.map((r) => r.url), ["https://example.com/a", "https://example.com/b"]);
  assert.equal(results[0].snippet, "Snippet for A");
});

test("parseSearchResults: a live results page, as the endpoint actually serves it", () => {
  // captured live 2026-08-16 with the organ's own UA
  const html = readFileSync(new URL("./eval/fixtures/ddg-results.html", import.meta.url), "utf8");
  const { blocked, offEndpoint, results } = parseSearchResults(html);
  assert.equal(blocked, false);
  assert.equal(offEndpoint, undefined);
  assert.equal(results.length, 10);
  assert.equal(results[0].url, "https://en.wikipedia.org/wiki/War_and_Peace");
  assert.ok(results.every((r) => /^https?:\/\//.test(r.url) && r.title.length > 0));
  assert.ok(results.every((r) => !r.url.includes("duckduckgo.com/l/")), "redirects unwrapped");
});

test("parseSearchResults: a 200 that is not the endpoint's page is off-endpoint, never an empty success", () => {
  // measured live: an intermediary answered 200 with this body
  const out = parseSearchResults("upstream connect error or disconnect/reset before headers. retried and the latest reset reason: connection timeout");
  assert.equal(out.offEndpoint, true);
  assert.equal(out.blocked, false);
});

test("parseSearchResults: the bot-block page is a typed refusal, never an empty success", () => {
  // the exact page this repo received when building the organ (2026-08-16):
  const blockedPage = readFileSync(new URL("./eval/fixtures/ddg-anomaly.html", import.meta.url), "utf8");
  const out = parseSearchResults(blockedPage);
  assert.equal(out.blocked, true);
  // and the endpoint's own page with no results is neither blocked nor off-endpoint
  assert.deepEqual(parseSearchResults('<html><body><a href="https://duckduckgo.com/html/">DuckDuckGo</a> No results.</body></html>'), { blocked: false, results: [] });
});

test("unwrapDdgHref: entity-encoded, protocol-relative, and absolute forms", () => {
  assert.equal(unwrapDdgHref("//duckduckgo.com/l/?uddg=https%3A%2F%2Fx.org%2Fp&amp;rut=z"), "https://x.org/p");
  assert.equal(unwrapDdgHref("//example.com/x"), "https://example.com/x");
  assert.equal(unwrapDdgHref("https://example.com/x"), "https://example.com/x");
  assert.equal(unwrapDdgHref("/html/?q=self"), null);
});

// ── the history fold ────────────────────────────────────────────────────────
test("foldWebHistory: later lines patch by id (the archive result lands late), newest first, bad lines counted", () => {
  const lines = [
    JSON.stringify({ id: "a", url: "https://x.org", retrievedAt: "2026-08-16T10:00:00Z", archive: { status: "pending" } }),
    "not json at all",
    JSON.stringify({ id: "b", url: "https://y.org", retrievedAt: "2026-08-16T11:00:00Z" }),
    JSON.stringify({ id: "a", archive: { status: "saved", url: "https://web.archive.org/web/20260816100501/https://x.org" } }),
    JSON.stringify({ noId: true }),
  ].join("\n");
  const { entries, skipped } = foldWebHistory(lines);
  assert.equal(skipped, 2);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].id, "b", "newest first");
  assert.equal(entries[1].url, "https://x.org", "patch keeps the original fields");
  assert.equal(entries[1].archive.status, "saved");
  assert.deepEqual(foldWebHistory(""), { entries: [], skipped: 0 });
});

// ── archive.org ─────────────────────────────────────────────────────────────
test("archiveUrlFrom: content-location path, absolute, redirect target, or null", () => {
  assert.equal(
    archiveUrlFrom({ contentLocation: "/web/20260816120000/https://x.org/p" }),
    "https://web.archive.org/web/20260816120000/https://x.org/p",
  );
  assert.equal(
    archiveUrlFrom({ contentLocation: "https://web.archive.org/web/20260816120000/https://x.org/p" }),
    "https://web.archive.org/web/20260816120000/https://x.org/p",
  );
  assert.equal(
    archiveUrlFrom({ contentLocation: null, finalUrl: "https://web.archive.org/web/20260816120000/https://x.org/p" }),
    "https://web.archive.org/web/20260816120000/https://x.org/p",
  );
  assert.equal(archiveUrlFrom({ contentLocation: "", finalUrl: "https://web.archive.org/save/https://x.org" }), null);
});

test("looksLikeChallenge names the interstitial, never the article", () => {
  // the exact case measured live: britannica.com behind Cloudflare
  assert.equal(looksLikeChallenge({ title: "Just a moment...", textChars: 0 }), true);
  assert.equal(looksLikeChallenge({ title: "Access denied", textChars: 12 }), true);
  // a real article whose title merely mentions robots is not a challenge
  assert.equal(looksLikeChallenge({ title: "Are you a robot? — a history of CAPTCHA", textChars: 54_000 }), false);
  assert.equal(looksLikeChallenge({ title: "War and Peace - Wikipedia", textChars: 72_176 }), false);
});

test("extForContentType names the file face", () => {
  assert.equal(extForContentType("text/html; charset=utf-8"), ".html");
  assert.equal(extForContentType("application/json"), ".json");
  assert.equal(extForContentType("application/pdf"), ".pdf");
  assert.equal(extForContentType("text/plain"), ".txt");
  assert.equal(extForContentType("application/octet-stream"), ".bin");
});

// ── declared numbers exist and are sane bounds, not tuned constants ────────
test("the declared numbers carry their duty", () => {
  assert.ok(WEB_FETCH_MAX_BYTES >= 1_000_000, "a page bound, not a snippet bound");
  assert.ok(WEB_SEARCH_MAX_RESULTS >= 5, "a page of results");
});

// ── the browser seam: the page still loads nothing remote ──────────────────
// P13 sanctions egress from the SERVER only. The Explore page may render an
// archive.org address as a link the user can choose to follow, but the page
// itself must never fetch from a non-local host — same rule II.13 pins for
// the Converse page's files.
test("P13 seam: explore.js and explore.html fetch only same-origin paths", () => {
  // preview.js joins the scan for the reason the others are in it: it builds
  // the src of every img, iframe, audio and video the preview shows, so it is
  // exactly where a remote host would slip in.
  for (const file of ["explore/explore.js", "explore/preview.js", "explore.html", "explore-bridge.js"]) {
    const src = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
    const hosts = [...src.matchAll(/https?:\/\/([^/"'` )>]+)/g)].map((m) => m[1]);
    for (const h of hosts) {
      assert.ok(
        /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(h) || h === "www.w3.org",
        `non-local host in ${file}: ${h} — remote fetching belongs to the server (P13), links to it must be built from server data, not hardcoded`,
      );
    }
  }
});
