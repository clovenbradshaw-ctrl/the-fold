// web.js — the web organ: the pure half of search and page ingestion.
//
// This module OWNS NO NETWORK. Everything here is a function from bytes the
// server already fetched (or stored) to structure: readable text out of a
// page's HTML, results out of a search endpoint's HTML, a history out of an
// append-only jsonl. The fetching itself — the one sanctioned egress this
// repo has (POLICIES P13, amending P1) — lives in explore-server.mjs, where
// it is recorded; keeping this half pure is what makes it testable offline.
//
// WHAT THIS FILE NEVER DOES: fetch; write; guess silently (a bot-blocked
// search page is a typed refusal, never an empty result list); interpret
// content (extraction strips container chrome per READING-POLICY P5.3 — a
// layout judgement, not a reading).

// ── declared numbers, each with its giver ───────────────────────────────────
// Givers: this file, engineering starting points (P9 — budgets are named,
// not tuned). None of these was chosen by checking an outcome.
export const WEB_FETCH_MAX_BYTES = 8_000_000; // one page, not a crawl; a bound on a response, refusal is typed
export const WEB_FETCH_TIMEOUT_MS = 20_000; // an interactive wait, not a batch one
export const WEB_SEARCH_MAX_RESULTS = 12; // a page of results; total found is reported next to shown
export const WEB_ARCHIVE_TIMEOUT_MS = 120_000; // archive.org Save Page Now is slow by design; it runs deferred
// The organ identifies itself honestly — it is a reader, not a browser.
export const WEB_UA = "the-fold-explore/0.1 (local research instrument; one page per explicit request)";

// ── url hygiene ─────────────────────────────────────────────────────────────
/**
 * The omnibox's judgement, shared with the server: http(s) only, loopback
 * refused (the web organ is for the web — local files already have the
 * tree). Bare domains get https. Returns a normalized URL string or null.
 */
export function normalizeUrl(input) {
  const s = String(input ?? "").trim();
  if (!s || /\s/.test(s)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  let u;
  try {
    u = new URL(withScheme);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (/^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|0\.0\.0\.0)$/i.test(u.hostname)) return null;
  if (!u.hostname.includes(".")) return null;
  return u.href;
}

export const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

// ── entities ────────────────────────────────────────────────────────────────
const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", copy: "©", deg: "°", middot: "·", times: "×", laquo: "«", raquo: "»", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", uuml: "ü", ouml: "ö", auml: "ä", szlig: "ß", ntilde: "ñ" };
export function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED[name.toLowerCase()] ?? m);
}

// ── readable extraction ─────────────────────────────────────────────────────
// P5.3's move, applied to the web's container: scripts, styles, and the
// page's own chrome (nav / header / footer / aside / form) are boilerplate
// around the material, stripped BEFORE the text face exists — so retrieval
// and folding never land in a cookie banner. This is a layout judgement on
// tags, not a reading of content; regexes over nested markup are imperfect,
// so container removal repeats until it stops changing.
const DROP_WHOLE = ["script", "style", "noscript", "template", "svg", "iframe", "object", "embed", "select", "canvas"];
const DROP_CONTAINER = ["nav", "header", "footer", "aside", "form", "dialog"];

// Attribute values may legally contain ">" (Wikipedia ships JSON inside
// data-mw='{…}'), so every tag pattern here walks quoted values instead of
// stopping at the first ">" — measured on the War and Peace fixture, where
// the naive pattern leaked half an attribute into the text face. Exported
// because the lesson is one lesson: primary.js walks the same markup for
// citations and must not re-learn it with a second, naive pattern.
export const ATTRS = `(?:[^>"']|"[^"]*"|'[^']*')*`;

function dropTag(html, tag, { dropUnclosedTail = false } = {}) {
  const re = new RegExp(`<${tag}\\b${ATTRS}>[\\s\\S]*?</${tag}\\s*>`, "gi");
  let prev;
  do {
    prev = html;
    html = html.replace(re, " ");
  } while (html !== prev);
  // For script/style an unclosed opener (truncated page) takes the rest with
  // it — half a script is not text. A container left unclosed by sloppy
  // markup keeps its tail: losing real content is the worse error there.
  return dropUnclosedTail ? html.replace(new RegExp(`<${tag}\\b${ATTRS}>[\\s\\S]*$`, "i"), " ") : html;
}

/**
 * html (string) -> { title, description, text, lang }
 * text keeps paragraph structure as blank lines and list items as "- " lines;
 * everything else about layout is dropped. Nothing is summarized here —
 * this is the WHOLE readable content; salience is the fold's job, later.
 */
export function extractReadable(html) {
  let h = String(html).replace(/<!--[\s\S]*?-->/g, " ");
  const title = decodeEntities((h.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim());
  const description = decodeEntities(
    h.match(/<meta\s[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]
    ?? h.match(/<meta\s[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1]
    ?? "",
  ).trim();
  const lang = h.match(/<html\s[^>]*lang=["']?([a-zA-Z-]+)/i)?.[1] ?? null;

  h = h.replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/i, " ");
  for (const t of DROP_WHOLE) h = dropTag(h, t, { dropUnclosedTail: true });
  for (const t of DROP_CONTAINER) h = dropTag(h, t);

  // block structure -> line structure, before tags go
  h = h
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(new RegExp(`<li\\b${ATTRS}>`, "gi"), "\n- ")
    .replace(/<\/(p|div|section|article|main|li|ul|ol|table|tr|blockquote|figure|figcaption|pre|dd|dt)\s*>/gi, "\n")
    .replace(new RegExp(`<(p|div|section|article|main|blockquote|figure|pre)\\b${ATTRS}>`, "gi"), "\n")
    .replace(/<\/(h[1-6])\s*>/gi, "\n\n")
    .replace(new RegExp(`<(h[1-6])\\b${ATTRS}>`, "gi"), "\n\n")
    .replace(/<\/t[dh]\s*>/gi, "\t");

  h = h.replace(new RegExp(`</?[a-zA-Z!]${ATTRS}>`, "g"), " ");
  h = decodeEntities(h);
  const text = h
    .split("\n")
    .map((line) => line.replace(/[ \t\u00a0]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title, description, text, lang };
}

/**
 * Some hosts answer a page-shaped bot challenge instead of the page
 * (measured live 2026-08-16: britannica.com served Cloudflare's "Just a
 * moment..." — 5.7KB, zero readable chars). The bytes are still saved and
 * the entry still tells the truth; this names the situation so the view
 * can say "the host declined" instead of presenting an empty page as the
 * article. A marker, not a deletion — never a reason to drop the entry.
 */
export function looksLikeChallenge({ title, textChars }) {
  return (textChars ?? 0) < 200 && /just a moment|attention required|access denied|are you a (?:robot|human)|enable javascript and cookies|verify you are|checking your browser|captcha/i.test(String(title ?? ""));
}

// ── search-result parsing ───────────────────────────────────────────────────
// DuckDuckGo's two no-key HTML faces (html.duckduckgo.com/html and
// lite.duckduckgo.com/lite). Both wrap result links in a redirect
// (`/l/?uddg=<encoded>`), unwrapped here so history holds real addresses.
// The endpoint also serves a bot-challenge page to addresses it distrusts —
// that page parses to ZERO results, which must surface as a typed refusal,
// never as "the web had nothing" (P4: gaps are results).
export function unwrapDdgHref(href) {
  const h = decodeEntities(String(href));
  const m = h.match(/[?&]uddg=([^&]+)/);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return null;
    }
  }
  if (/^\/\//.test(h)) return `https:${h}`;
  return /^https?:\/\//i.test(h) ? h : null;
}

export function parseSearchResults(html) {
  const h = String(html);
  if (/anomaly\.js|anomaly-modal|cc=botnet/i.test(h)) {
    return { blocked: true, results: [] };
  }
  const results = [];
  const seen = new Set();
  const push = (href, title, snippet) => {
    const url = unwrapDdgHref(href);
    if (!url || /duckduckgo\.com\/(y\.js|html|lite)/.test(url)) return; // ads and self-links
    if (seen.has(url)) return;
    seen.add(url);
    results.push({
      title: decodeEntities(title.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim(),
      url,
      snippet: decodeEntities(snippet.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim(),
    });
  };

  // the /html face: anchors classed result__a, each paired with the snippet
  // that appears before the NEXT result anchor (two passes — a lazy scan
  // followed by an optional group would silently never look forward).
  const anchors = [...h.matchAll(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  anchors.forEach((m, i) => {
    const upTo = anchors[i + 1]?.index ?? h.length;
    const between = h.slice(m.index + m[0].length, upTo);
    const snip = between.match(/<(?:a|td|div)[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|td|div)>/i);
    push(m[1], m[2], snip?.[1] ?? "");
  });

  // the /lite face: anchors classed result-link, snippets in result-snippet cells
  if (!results.length) {
    const links = [...h.matchAll(/<a[^>]*href="([^"]+)"[^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>|<a[^>]*class=['"]result-link['"][^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    const snips = [...h.matchAll(/<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi)];
    links.forEach((m, i) => push(m[1] ?? m[3], m[2] ?? m[4] ?? "", snips[i]?.[1] ?? ""));
  }
  // Zero results on a page that is not the endpoint's page at all (a proxy
  // error body, a captive portal) is a FAILED search, not an empty one —
  // measured live 2026-08-16: an intermediary's 200 "upstream connect error"
  // text would otherwise have shipped as "the web had nothing".
  if (!results.length && !/duckduckgo/i.test(h)) {
    return { blocked: false, offEndpoint: true, results: [] };
  }
  return { blocked: false, results };
}

// ── the history fold ────────────────────────────────────────────────────────
// web/history.jsonl is append-only IN OPERATION (a fetch appends its entry;
// a late-landing archive.org result appends a patch line carrying the same
// id) and clearable BY DECISION — that pairing is the point: the store the
// user may empty is a different file from the record the constitution says
// no one empties (record/explore-record.jsonl, where every fetch and every
// clear stays written). The current history is a fold over the lines, same
// shape as P3's plan fold: later lines with a known id merge onto earlier
// ones; unparseable lines are counted, never silently skipped.
export function foldWebHistory(jsonl) {
  const byId = new Map();
  let skipped = 0;
  for (const line of String(jsonl ?? "").split("\n")) {
    if (!line.trim()) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      skipped++;
      continue;
    }
    if (!obj || typeof obj.id !== "string") {
      skipped++;
      continue;
    }
    const prev = byId.get(obj.id);
    byId.set(obj.id, prev ? { ...prev, ...obj } : obj);
  }
  const entries = [...byId.values()].sort((a, b) => String(b.retrievedAt ?? "").localeCompare(String(a.retrievedAt ?? "")));
  return { entries, skipped };
}

// ── archive.org ─────────────────────────────────────────────────────────────
/**
 * The Wayback Machine's Save Page Now answers a GET of /save/<url> with the
 * snapshot's address in Content-Location (sometimes only as the final
 * redirect target). Given the response's pieces, name the stable URL or null.
 */
export function archiveUrlFrom({ contentLocation, finalUrl }) {
  const cl = contentLocation ?? "";
  if (/^\/web\/\d+/.test(cl)) return `https://web.archive.org${cl}`;
  if (/^https?:\/\/web\.archive\.org\/web\/\d+/.test(cl)) return cl;
  if (/^https?:\/\/web\.archive\.org\/web\/\d+/.test(finalUrl ?? "")) return finalUrl;
  return null;
}

/**
 * The static URL for a saved page face. History entries carry paths in the
 * FILE API's space (relative to the browse root, e.g. "the-fold/web/pages/
 * ab12….txt") because Explore's openSource speaks that space. The static
 * server's URL space is rooted one level lower, at this directory — so a
 * client that fetches `${base}/${textPath}` gets the 404 body, and judging
 * a claim against the literal text "not found" is a silent wrong verdict
 * (measured live 2026-08-17: every proof came back web-uncorroborated).
 * The pages directory is flat and content-addressed, so the basename alone
 * names the file in the static space.
 */
export function pageFaceUrl(base, storedPath) {
  const name = String(storedPath ?? "").split("/").pop();
  return name ? `${base}/web/pages/${name}` : null;
}

/** The file face a saved page gets, from its content-type. */
export function extForContentType(ct) {
  const t = String(ct ?? "").toLowerCase();
  if (t.includes("html")) return ".html";
  if (t.includes("json")) return ".json";
  if (t.includes("pdf")) return ".pdf";
  if (t.includes("xml")) return ".xml";
  if (t.startsWith("text/csv")) return ".csv";
  if (t.startsWith("text/markdown")) return ".md";
  if (t.startsWith("text/")) return ".txt";
  return ".bin";
}
