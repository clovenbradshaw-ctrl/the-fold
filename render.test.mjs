// render.test.mjs — the pure parsing core under node --test, and the DOM
// projection against a stub document (no browser, no dependency). The
// contract under test is the one agreed with the session that owns app.js:
// block structure only, every inline run through decorateInline, addresses
// never split, fenced code and tables NOT handled here (artifact.js owns
// them).

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBlocks, parseInline, renderBlocksInto } from "./render.js";

// ── parseBlocks ─────────────────────────────────────────────────────────────

test("headings # through ### parse with their level; #### is prose", () => {
  const blocks = parseBlocks("# One\n## Part\n### Deep\n#### not a heading");
  assert.deepEqual(blocks.map((b) => b.type), ["heading", "heading", "heading", "para"]);
  assert.deepEqual(blocks.slice(0, 3).map((b) => b.level), [1, 2, 3]);
  assert.equal(blocks[1].text, "Part");
});

test("unordered and ordered lists gather their items; indented continuations join the item above", () => {
  const blocks = parseBlocks("- a\n- b\n  continued\n\n1. x\n2) y");
  assert.equal(blocks[0].type, "list");
  assert.equal(blocks[0].ordered, false);
  assert.deepEqual(blocks[0].items, ["a", "b continued"]);
  assert.equal(blocks[1].ordered, true);
  assert.deepEqual(blocks[1].items, ["x", "y"]);
});

test("blockquotes and paragraphs keep their lines; blank lines separate paragraphs", () => {
  const blocks = parseBlocks("> quoted\n> more\n\nplain one\nplain two\n\nnext");
  assert.equal(blocks[0].type, "quote");
  assert.deepEqual(blocks[0].lines, ["quoted", "more"]);
  assert.equal(blocks[1].type, "para");
  assert.deepEqual(blocks[1].lines, ["plain one", "plain two"]);
  assert.equal(blocks[2].type, "para");
});

test("fenced code is NOT a block here — artifact.js owns it, so ``` lines stay prose", () => {
  const blocks = parseBlocks("```js\ncode()\n```");
  assert.ok(blocks.every((b) => b.type === "para"), "no code block type exists in this parser");
});

// ── parseInline ─────────────────────────────────────────────────────────────

test("bold, italic and code split into marked runs", () => {
  assert.deepEqual(parseInline("a **b** c"), [
    { text: "a ", marks: [] },
    { text: "b", marks: ["strong"] },
    { text: " c", marks: [] },
  ]);
  assert.deepEqual(parseInline("x *y* z"), [
    { text: "x ", marks: [] },
    { text: "y", marks: ["em"] },
    { text: " z", marks: [] },
  ]);
  assert.deepEqual(parseInline("see `f(x)` here")[1], { text: "f(x)", marks: ["code"] });
});

test("code spans are literal — emphasis inside them is not parsed", () => {
  assert.deepEqual(parseInline("`a *b* c`"), [{ text: "a *b* c", marks: ["code"] }]);
});

test("emphasis must hug its content — 'a * b * c' stays as written", () => {
  assert.deepEqual(parseInline("a * b * c"), [{ text: "a * b * c", marks: [] }]);
});

test("unmatched markers are ordinary characters", () => {
  assert.deepEqual(parseInline("2 ** 3 is *not closed"), [{ text: "2 ** 3 is *not closed", marks: [] }]);
});

test("emphasis spans soft line breaks — a ** opened on one line and closed two lines later is one emphasis", () => {
  const runs = parseInline("**Perceive only by difference.\nTestify only from a ground.\nStay alive.**");
  assert.equal(runs.length, 1);
  assert.deepEqual(runs[0].marks, ["strong"]);
  assert.ok(!runs[0].text.includes("**"), "no literal asterisks survive");

  // And the DOM projection re-splits the newlines AFTER mark resolution:
  // three <strong> segments with <br> between, decorateInline never seeing a newline.
  const doc = {
    createElement(tag) {
      return { tagName: tag, children: [], ownerDocument: doc, appendChild(n) { this.children.push(n); return n; } };
    },
  };
  const container = doc.createElement("div");
  const seen = [];
  renderBlocksInto(container, "> **line one\n> line two**", (chunk) => {
    seen.push(chunk);
    return [{ text: chunk, appendChild() {} }];
  });
  const quote = container.children[0];
  assert.equal(quote.tagName, "blockquote");
  assert.deepEqual(quote.children.map((c) => c.tagName), ["strong", "br", "strong"]);
  assert.ok(seen.every((c) => !c.includes("\n")), "decorateInline chunks stay newline-free");
});

test("a bracketed address is never split, and markers inside it are not markers", () => {
  // The address chip pattern the app decorates: [name#start-end].
  const runs = parseInline("see [pg2600.txt#80-174] and **[a*b.txt#1-2]**");
  const texts = runs.map((r) => r.text);
  assert.ok(texts.some((t) => t.includes("[pg2600.txt#80-174]")), "plain address arrives intact");
  const bold = runs.find((r) => r.marks.includes("strong"));
  assert.equal(bold.text, "[a*b.txt#1-2]", "address inside emphasis arrives intact, star and all");
});

// ── renderBlocksInto against a stub document ────────────────────────────────

function stubDoc() {
  const doc = {
    createElement(tag) {
      return {
        tagName: tag,
        className: "",
        children: [],
        ownerDocument: doc,
        appendChild(n) {
          this.children.push(n);
          return n;
        },
      };
    },
  };
  return doc;
}

test("renderBlocksInto builds the block tree and routes every inline run through decorateInline", () => {
  const doc = stubDoc();
  const container = doc.createElement("div");
  const seen = [];
  const decorate = (chunk) => {
    seen.push(chunk);
    return [{ text: chunk, ownerDocument: doc, appendChild() {} }];
  };

  renderBlocksInto(container, "## Part 1 — the ground\n\nplain with [f.txt#3-9] and **bold**\n\n- item one\n- item two", decorate);

  assert.deepEqual(container.children.map((c) => c.tagName), ["h4", "div", "ul"]);
  assert.equal(container.children[2].children.length, 2);
  // The address reached the decorator unsplit; the bold text reached it as
  // its own chunk; nothing was innerHTML'd anywhere (the stub has none).
  assert.ok(seen.some((c) => c.includes("[f.txt#3-9]")));
  assert.ok(seen.includes("bold"));
  // The bold run is wrapped in a <strong> the renderer created.
  const para = container.children[1];
  assert.ok(para.children.some((c) => c.tagName === "strong"));
});

test("a paragraph's single newlines are soft breaks — joined with spaces, never <br>", () => {
  const doc = {
    createElement(tag) {
      return { tagName: tag, children: [], ownerDocument: doc, appendChild(n) { this.children.push(n); return n; } };
    },
  };
  const container = doc.createElement("div");
  const seen = [];
  renderBlocksInto(container, "and a workbench\nis a speaker, since every cell\nis a claim.", (chunk) => {
    seen.push(chunk);
    return [{ text: chunk, appendChild() {} }];
  });
  assert.equal(container.children.length, 1);
  assert.ok(!container.children[0].children.some((c) => c.tagName === "br"), "no hard breaks inside a soft-wrapped paragraph");
  assert.ok(seen.some((c) => c.includes("workbench is a speaker")), "the wrap joins as a space");
});

test("a text with no block markers renders as one paragraph — today's shape, unchanged", () => {
  const doc = stubDoc();
  const container = doc.createElement("div");
  const decorate = (chunk) => [{ text: chunk, appendChild() {} }];
  renderBlocksInto(container, "just a sentence.", decorate);
  assert.equal(container.children.length, 1);
  assert.equal(container.children[0].tagName, "div");
  assert.equal(container.children[0].className, "para");
});
