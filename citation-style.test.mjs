import { test } from "node:test";
import assert from "node:assert/strict";
import { formatAPA, formatMLA, formatPlain, formatReference, CITATION_STYLES, DEFAULT_CITATION_STYLE } from "./citation-style.js";

const webRef = {
  name: "britannica.com-0",
  title: "Marie Curie | Biography, Nobel Prizes, Radioactivity, & Facts",
  author: null,
  site: "Encyclopedia Britannica",
  url: "https://www.britannica.com/biography/Marie-Curie",
  accessedOn: new Date(2026, 8, 9), // September 9 2026 — Date's month is 0-indexed
  kind: "web",
};

const attachedRef = { name: "pasted.txt", title: null, author: null, site: null, url: null, accessedOn: null, kind: "attached" };

test("APA: a web source with no personal author falls back to the site as the credited organization, and never invents a publish date", () => {
  const line = formatAPA(webRef);
  assert.match(line, /^Encyclopedia Britannica\. \(n\.d\.\)\./);
  assert.match(line, /Marie Curie \| Biography/);
  assert.match(line, /Retrieved September 9, 2026, from/);
  assert.match(line, /https:\/\/www\.britannica\.com\/biography\/Marie-Curie$/);
});

test("APA: attached material (pasted, uploaded) cites as unpublished, never with a fabricated site or date", () => {
  const line = formatAPA(attachedRef);
  assert.equal(line, "pasted.txt. (n.d.). [Unpublished material attached to this conversation].");
});

test("MLA: a web source quotes its title and names the site, with an access date, never a publish date it does not have", () => {
  const line = formatMLA(webRef);
  assert.match(line, /^"Marie Curie \| Biography, Nobel Prizes, Radioactivity, & Facts\." Encyclopedia Britannica, https:\/\/www\.britannica\.com\/biography\/Marie-Curie\./);
  assert.match(line, /Accessed 9 September\. 2026\.$/);
});

test("MLA: attached material cites plainly, no fabricated title quoting a URL that does not exist", () => {
  const line = formatMLA(attachedRef);
  assert.equal(line, '"pasted.txt." Attached material, n.d.');
});

test("plain: this instrument's own floor — name and URL, nothing dressed up", () => {
  assert.equal(formatPlain(webRef), "britannica.com-0 — https://www.britannica.com/biography/Marie-Curie");
  assert.equal(formatPlain(attachedRef), "pasted.txt");
});

test("a reference missing every optional field still formats without throwing, in every style — the name alone is enough to stand on", () => {
  const bare = { name: "some-source", title: null, author: null, site: null, url: null, accessedOn: null, kind: "web" };
  for (const style of Object.keys(CITATION_STYLES)) {
    const line = formatReference(bare, style);
    assert.equal(typeof line, "string");
    assert.ok(line.includes("some-source"), `${style} should still name the source when nothing else is known`);
  }
});

test("formatReference refuses an unknown style rather than silently defaulting", () => {
  assert.throws(() => formatReference(webRef, "chicago"), /unknown style/);
});

test("CITATION_STYLES names a label for every style, and the default is one of them", () => {
  for (const key of Object.keys(CITATION_STYLES)) assert.equal(typeof CITATION_STYLES[key].label, "string");
  assert.ok(CITATION_STYLES[DEFAULT_CITATION_STYLE]);
});
