// provenance-render.test.mjs — the contract between provenance.js's
// sentenceSpans (now eoreader7/native/organs/provenance.js, reached here
// through the shim) and render.js's own block splitting. Split out of
// provenance.test.mjs on 2026-09-14 (Phase 4 organ migration): provenance.js
// itself is pure and moved whole, but render.js is the surface's own inline-
// markdown renderer and does not cross the seam — this integration test
// stays here, at the boundary it actually tests.

import { test } from "node:test";
import assert from "node:assert/strict";

import { classifySentences, sentenceSpans } from "./provenance.js";
import { parseBlocks, renderBlocksInto } from "./render.js";

// FOUND LIVE 2026-09-09: two DOM captures of an otherwise identical checking-
// mode turn, one with the full `.sent`/ground-chip markup, one with NEITHER
// — plain `<strong>` text and nothing else, despite `state.grounded` and a
// fresh `state.lastGround` both confirmed. app.js's own render-fragment
// matcher (`findSentence`, mirrored here — app.js has no test file of its
// own by this repo's convention, so the fix's essential mechanism is pinned
// at this pure layer instead) is injected, same as `splitSentences`
// elsewhere in this codebase (chain-reason.js's own stated convention).
//
// app.js used to call this search once PER RENDER FRAGMENT, after
// render.js's own `renderBlocksInto` had already split a block's raw text
// at every `**bold**`/`*em*`/`` `code` `` boundary and handed each piece to
// its `decorateInline` callback separately — render.js's own documented
// contract ("Inline emphasis... is implemented by SPLITTING the text and
// routing every piece through decorateInline"), and exactly right for a
// plain address-only decorator. It was NOT right for a decorator trying to
// match a WHOLE classified sentence: any inline emphasis anywhere inside a
// sentence tears it across fragments no single one of which contains the
// whole sentence, so a per-fragment search finds nothing on ANY of them.
// `sentenceSpans` is the fix: run once, up front, against a block's whole
// text (app.js's `renderTaggedBlocks`), before anything downstream is free
// to fragment it.
function findSentence(hay, sentence) {
  // Mirrors app.js's own findSentence (same file, unexported) byte for
  // byte — this codebase's own convention for a tiny pure helper reused
  // across files without a cross-module import (see escapeRe, duplicated
  // the same way in relations-chain.js, shape.js, turn-boundary.js).
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const words = String(sentence).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const m = hay.match(new RegExp(words.map(escapeRe).join("\\s+")));
  return m ? { at: m.index, len: m[0].length } : null;
}

test("REGRESSION (root cause, 2026-09-09): a fragment split at an inline-emphasis boundary can never contain a whole classified sentence — every fragment misses, using the real render.js splitter", () => {
  // The exact live specimen: "The Berlin Wall fell in 1989. The German
  // chancellor at the time was Helmut Kohl." with the year and the name
  // bolded — routine on exactly the figures a checked answer most wants to
  // mark. Two classified sentences, real markdown, real render.js.
  const answer = "The Berlin Wall fell in **1989**.  The German chancellor at the time was **Helmut Kohl**.";
  const classified = classifySentences(answer, [], []);
  assert.equal(classified.length, 2, "sanity: two sentences, both carrying their own markdown");

  // The OLD, broken wiring: renderBlocksInto's decorateInline is called
  // once per marker-split fragment, and each fragment is tested for
  // whether it contains a WHOLE classified sentence — app.js's own former
  // call site, reproduced exactly (classified.filter((e) =>
  // findSentence(chunk, e.text))).
  const seenFragments = [];
  const matchesPerFragment = [];
  // node --test has no DOM; a stub document (same shape render.test.mjs's
  // own stubDoc uses) is all renderBlocksInto's block/wrapper elements need
  // — decorateInline itself never touches the elements it is handed here.
  const doc = { createElement(tag) { return { tagName: tag, ownerDocument: doc, appendChild() {} }; } };
  const container = doc.createElement("div");
  renderBlocksInto(container, answer, (chunk) => {
    seenFragments.push(chunk);
    matchesPerFragment.push(classified.filter((e) => findSentence(chunk, e.text)).length);
    return [];
  });
  assert.ok(seenFragments.length > 1, "the bold markers really did split this into multiple fragments");
  assert.ok(
    matchesPerFragment.every((n) => n === 0),
    "root cause, pinned: with the OLD per-fragment search, NOT ONE fragment contains a whole sentence — zero matches anywhere, which is why zero .sent spans were drawn (not a weak tier — the wrapping code never ran)",
  );

  // The FIX: sentenceSpans run ONCE against each render.js BLOCK's own
  // whole text (app.js's renderTaggedBlocks calls taggedProse this way,
  // never per already-split fragment) finds both sentences, markdown and
  // all — exactly the composition the live fix uses.
  const blocks = parseBlocks(answer);
  assert.equal(blocks.length, 1, "one paragraph block");
  const spans = sentenceSpans(blocks[0].lines.join(" "), classified, findSentence);
  assert.equal(spans.length, 2, "fixed: both sentences found once the search runs before any fragment split");
  assert.deepEqual(
    spans.map((s) => s.entry.text),
    classified.map((c) => c.text),
  );
});

test("a sentence with no emphasis at all was never broken — the one-fragment case, pinned so it stays working", () => {
  // Case B from the same live session: no markdown, one sentence, one
  // fragment — this path already worked and must go on working.
  const answer = "The Wright brothers first flew on December 17, 1903, at Kitty Hawk, North Carolina.";
  const classified = classifySentences(answer, [], []);
  const seenFragments = [];
  // node --test has no DOM; a stub document (same shape render.test.mjs's
  // own stubDoc uses) is all renderBlocksInto's block/wrapper elements need
  // — decorateInline itself never touches the elements it is handed here.
  const doc = { createElement(tag) { return { tagName: tag, ownerDocument: doc, appendChild() {} }; } };
  const container = doc.createElement("div");
  renderBlocksInto(container, answer, (chunk) => {
    seenFragments.push(chunk);
    return [];
  });
  assert.equal(seenFragments.length, 1, "no emphasis markers, so renderBlocksInto hands it over whole");
  assert.ok(classified.some((e) => findSentence(seenFragments[0], e.text)), "and the old per-fragment search still found it");
});
