// node --test links.test.mjs
//
// A cited URL is checked before it is asserted, never taken on its own
// word. Offline: `checked` is a plain Map the tests populate directly —
// exactly the shape the impure caller (holon.js's runPart) would build from
// real fetches through the P13 egress.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  LINK_CHECKS_PER_PART,
  extractLinkAtoms,
  foldLinkVerdict,
  linkFindings,
  stripDeadLinks,
  trimUrlPunctuation,
  urlInMaterial,
  verifyLinks,
} from "./links.js";

test("extractLinkAtoms finds URL-shaped spans and trims trailing sentence punctuation", () => {
  const text = "See https://example.org/report. Also (https://example.org/wiki(x)) and https://example.org/a, then https://example.org/b?q=1.";
  const atoms = extractLinkAtoms(text);
  assert.deepEqual(
    atoms.map((a) => a.text),
    [
      "https://example.org/report",
      "https://example.org/wiki(x)",
      "https://example.org/a",
      "https://example.org/b?q=1",
    ],
  );
  // Offsets land exactly on the trimmed token in the original string.
  for (const a of atoms) assert.equal(text.slice(a.start, a.end), a.text);
});

test("trimUrlPunctuation keeps a balanced trailing paren (Wikipedia's disambiguation URLs), drops a sentence's wrapping one", () => {
  assert.equal(trimUrlPunctuation("https://x.org/wiki(Foo)"), "https://x.org/wiki(Foo)");
  // The regex is greedy past both parens when the URL is itself wrapped in
  // prose parens — one closing paren belongs to the URL's own path, the
  // outer one to the sentence, and only the count says which is which.
  assert.equal(trimUrlPunctuation("https://x.org/wiki(Foo))"), "https://x.org/wiki(Foo)");
  assert.equal(trimUrlPunctuation("https://x.org/a."), "https://x.org/a");
  assert.equal(trimUrlPunctuation("https://x.org/a,"), "https://x.org/a");
});

test("urlInMaterial: exact containment against loaded passage bytes", () => {
  const passages = [{ text: "The report cites https://example.org/report as its source." }];
  assert.equal(urlInMaterial("https://example.org/report", passages), true);
  assert.equal(urlInMaterial("https://example.org/fabricated", passages), false);
  assert.equal(urlInMaterial("", passages), false);
});

test("foldLinkVerdict: in-material short-circuits before any fetch is considered", () => {
  assert.deepEqual(foldLinkVerdict({ inMaterial: true, attempted: true, fetched: { ok: false } }), { verdict: "in-material" });
});

test("foldLinkVerdict: never checked is unexamined, not assumed fine", () => {
  assert.deepEqual(foldLinkVerdict({}), { verdict: "unexamined" });
  assert.deepEqual(foldLinkVerdict({ attempted: false }), { verdict: "unexamined" });
});

test("foldLinkVerdict: a completed fetch that reads as real content resolves", () => {
  const v = foldLinkVerdict({ attempted: true, fetched: { ok: true, status: 200, textChars: 4000, title: "A Real Page" } });
  assert.deepEqual(v, { verdict: "resolved", title: "A Real Page" });
});

test("foldLinkVerdict: non-2xx, a network gap, or an empty text face are all unreachable", () => {
  assert.equal(foldLinkVerdict({ attempted: true, fetched: { ok: false, status: 404 } }).verdict, "unreachable");
  assert.equal(foldLinkVerdict({ attempted: true, fetched: { gap: { silence: "not-present", detail: "timed out" } } }).verdict, "unreachable");
  assert.equal(foldLinkVerdict({ attempted: true, fetched: { ok: true, status: 200, textChars: 0 } }).verdict, "unreachable");
});

test("foldLinkVerdict: a bot-challenge page is disclosed, never accused of fabrication", () => {
  const v = foldLinkVerdict({ attempted: true, fetched: { ok: true, status: 200, textChars: 50, challenge: true } });
  assert.equal(v.verdict, "challenge");
});

test("verifyLinks folds every URL in the text against material + the checked map", () => {
  const text = "The paper is at https://real.example/paper and also https://fake.example/nothing, both discussed above.";
  const passages = [{ text: "background passage with no urls" }];
  const checked = new Map([
    ["https://real.example/paper", { ok: true, status: 200, textChars: 500, title: "Paper" }],
    ["https://fake.example/nothing", { ok: false, status: 404 }],
  ]);
  const report = verifyLinks(text, passages, checked);
  assert.equal(report.examined, true);
  assert.equal(report.links.length, 2);
  assert.equal(report.links[0].verdict, "resolved");
  assert.equal(report.links[1].verdict, "unreachable");
});

test("verifyLinks: a URL the caller never attempted (budget spent, web off) is unexamined, not silently passed", () => {
  const text = "See https://untouched.example/page for more.";
  const report = verifyLinks(text, [], new Map());
  assert.equal(report.links[0].verdict, "unexamined");
});

test("linkFindings reports only the unreachable ones, naming the address and what failed", () => {
  const report = {
    links: [
      { text: "https://a.example", verdict: "resolved" },
      { text: "https://b.example", verdict: "unreachable", detail: "answered 404" },
      { text: "https://c.example", verdict: "challenge", detail: "bot-challenge" },
      { text: "https://d.example", verdict: "unexamined" },
      { text: "https://e.example", verdict: "in-material" },
    ],
  };
  const findings = linkFindings(report);
  assert.equal(findings.length, 1);
  assert.match(findings[0], /https:\/\/b\.example/);
  assert.match(findings[0], /answered 404/);
});

test("stripDeadLinks replaces every unreachable link with a named marker, leaves everything else untouched", () => {
  const text = "Real: https://real.example/x. Fake: https://fake.example/y is cited here.";
  const checked = new Map([
    ["https://real.example/x", { ok: true, status: 200, textChars: 100 }],
    ["https://fake.example/y", { ok: false, status: 404 }],
  ]);
  const report = verifyLinks(text, [], checked);
  const { text: out, removed } = stripDeadLinks(text, report);
  assert.equal(removed.length, 1);
  assert.equal(removed[0].url, "https://fake.example/y");
  assert.match(out, /Real: https:\/\/real\.example\/x\./);
  // The marker still NAMES the removed address (transparency: the reader
  // can see what the model tried to cite) — what must be gone is the bare
  // form that would render as a plain, working-looking citation.
  assert.doesNotMatch(out, /Fake: https:\/\/fake\.example\/y is/);
  assert.match(out, /\[link removed — did not resolve: https:\/\/fake\.example\/y\]/);
});

test("stripDeadLinks is idempotent: running it again on its own output finds nothing left to strip", () => {
  const text = "Fake: https://fake.example/y here.";
  const checked = new Map([["https://fake.example/y", { ok: false, status: 404 }]]);
  const first = stripDeadLinks(text, verifyLinks(text, [], checked));
  const second = stripDeadLinks(first.text, verifyLinks(first.text, [], new Map()));
  assert.equal(second.removed.length, 0);
  assert.equal(second.text, first.text);
});

test("stripDeadLinks right-to-left ordering keeps earlier offsets valid with multiple dead links", () => {
  const text = "First https://a.example/dead1 then https://b.example/dead2 end.";
  const checked = new Map([
    ["https://a.example/dead1", { ok: false, status: 500 }],
    ["https://b.example/dead2", { ok: false, status: 500 }],
  ]);
  const report = verifyLinks(text, [], checked);
  const { text: out, removed } = stripDeadLinks(text, report);
  assert.equal(removed.length, 2);
  assert.match(out, /^First \[link removed — did not resolve: https:\/\/a\.example\/dead1\] then \[link removed — did not resolve: https:\/\/b\.example\/dead2\] end\.$/);
});

test("the declared budget carries its duty", () => {
  assert.equal(typeof LINK_CHECKS_PER_PART, "number");
  assert.ok(LINK_CHECKS_PER_PART > 0);
});
