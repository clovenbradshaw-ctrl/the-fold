// preview.test.mjs — the preview's own assay: which face a modality earns,
// what a cap says out loud, and what the "no viewer" refusal is made of.
//
// DOM through a stub document, the same way render.test.mjs does it: the
// module builds every node through `box.ownerDocument`, so the whole face is
// testable in node with no browser and no dependency.

import { test } from "node:test";
import assert from "node:assert/strict";
import { previewFace, parseDelimited, capLines, buildPreview, FACE_NOTE, TABLE_ROW_CAP, CODE_LINE_CAP } from "./explore/preview.js";

function stubDoc() {
  const doc = {
    createElement(tag) {
      return {
        tagName: tag,
        className: "",
        children: [],
        attrs: {},
        ownerDocument: doc,
        set textContent(v) {
          this._text = v;
        },
        get textContent() {
          // what a reader would see: this node's own text plus its children's
          return (this._text ?? "") + this.children.map((c) => c.textContent ?? "").join(" ");
        },
        setAttribute(k, v) {
          this.attrs[k] = v;
        },
        appendChild(n) {
          this.children.push(n);
          return n;
        },
      };
    },
  };
  return doc;
}
const box = () => stubDoc().createElement("div");
/** Every node in the built tree, flattened — the shape assertions read off this. */
const walk = (n) => [n, ...n.children.flatMap(walk)];
const tags = (n) => walk(n).map((x) => x.tagName);

// ── which face ──────────────────────────────────────────────────────────────

test("each modality earns exactly one face, and an unknown one earns the refusal", () => {
  const face = (modality) => previewFace({ modality });
  assert.equal(face("image"), "image");
  assert.equal(face("audio"), "audio");
  assert.equal(face("video"), "video");
  assert.equal(face("pdf"), "pdf");
  assert.equal(face("html"), "html");
  assert.equal(face("markdown"), "markdown");
  assert.equal(face("table"), "table");
  assert.equal(face("json"), "code");
  assert.equal(face("code"), "code");
  assert.equal(face("text"), "text");
  // A .docx is a zip of XML: this page has no viewer for it and says so.
  assert.equal(face("binary"), "none");
  assert.equal(previewFace(undefined), "none");
});

test("every face has a sentence saying what it is showing", () => {
  for (const f of ["image", "audio", "video", "pdf", "html", "markdown", "table", "code", "text", "none"]) {
    assert.equal(typeof FACE_NOTE[f], "string", `${f} has no note`);
    assert.ok(FACE_NOTE[f].length > 10, `${f}'s note says nothing`);
  }
});

// ── the delimited reader (shared with the reader's table face) ───────────────

test("quoted fields keep their delimiters, doubled quotes collapse, CRLF ends a row", () => {
  const { head, body } = parseDelimited('a,b\r\n"x,1","he said ""hi"""\r\n');
  assert.deepEqual(head, ["a", "b"]);
  assert.deepEqual(body, [["x,1", 'he said "hi"']]);
});

test("a tab-delimited file is read on its own delimiter", () => {
  const { head, body } = parseDelimited("a\tb\n1\t2\n", "\t");
  assert.deepEqual(head, ["a", "b"]);
  assert.deepEqual(body, [["1", "2"]]);
});

test("the row cap counts what it dropped instead of implying nothing is there", () => {
  const text = ["h"].concat(Array.from({ length: 30 }, (_, i) => String(i))).join("\n");
  const { body, totalDataRows, dropped } = parseDelimited(text, ",", 10);
  assert.equal(body.length, 10);
  assert.equal(totalDataRows, 30);
  assert.equal(dropped, 20, "the 20 rows past the cap are counted, not silent");
});

test("capLines keeps the head of a long file and says how much it left", () => {
  const { lines, total, dropped } = capLines("a\nb\nc\nd", 2);
  assert.deepEqual(lines, ["a", "b"]);
  assert.equal(total, 4);
  assert.equal(dropped, 2);
  assert.equal(capLines("one line").dropped, 0);
  assert.ok(CODE_LINE_CAP > 0 && TABLE_ROW_CAP > 0, "the caps are declared numbers, not magic in the body");
});

// ── the faces, built ────────────────────────────────────────────────────────

test("the image face is an img pointed at the local bytes and nothing else", () => {
  const b = box();
  const face = buildPreview(b, { source: { modality: "image", name: "logo.png", bytes: 10 }, rawUrl: "/api/raw?path=logo.png" });
  assert.equal(face, "image");
  const img = walk(b).find((n) => n.tagName === "img");
  assert.equal(img.src, "/api/raw?path=logo.png");
  assert.ok(img.src.startsWith("/api/"), "the only host a face may name is this one");
});

test("the html face renders into an EMPTY sandbox — a picture of the page, never a running one", () => {
  const b = box();
  buildPreview(b, { source: { modality: "html", name: "p.html", bytes: 9 }, text: "<h1>hi</h1>", rawUrl: "/api/raw?path=p.html" });
  const frame = walk(b).find((n) => n.tagName === "iframe");
  assert.equal(frame.attrs.sandbox, "", "an empty sandbox is the whole point: no scripts, no origin, no network");
  assert.equal(frame.srcdoc, "<h1>hi</h1>");
});

test("raw wins over rendered for markdown and html: the same bytes, the other face", () => {
  const b = box();
  const drawn = buildPreview(b, { source: { modality: "markdown", name: "r.md", bytes: 4 }, text: "# hi\nthere", raw: true, rawUrl: "/x", markdown: () => assert.fail("the rendered face must not run when raw is asked for") });
  assert.equal(drawn, "raw");
  assert.ok(tags(b).includes("pre"), "the raw face is the bytes with their line numbers");
});

test("the markdown face is handed to the page's own renderer, holder and text", () => {
  const b = box();
  let got = null;
  const drawn = buildPreview(b, { source: { modality: "markdown", name: "r.md", bytes: 4 }, text: "# hi", rawUrl: "/x", markdown: (holder, text) => (got = { holder, text }) });
  assert.equal(drawn, "markdown");
  assert.equal(got.text, "# hi");
  assert.equal(got.holder.className, "pv-md");
});

test("the table face draws a header row and its data rows, and says how many of how many", () => {
  const b = box();
  const text = "name,n\n" + Array.from({ length: 3 }, (_, i) => `r${i},${i}`).join("\n");
  const drawn = buildPreview(b, { source: { modality: "table", name: "t.csv", bytes: 20, delimiter: "," }, text, rawUrl: "/x" });
  assert.equal(drawn, "table");
  assert.equal(walk(b).filter((n) => n.tagName === "th").length, 2);
  assert.equal(walk(b).filter((n) => n.tagName === "tr").length, 4, "header plus three rows");
  const said = walk(b).find((n) => n.className === "pv-said");
  assert.match(said.textContent, /3 of 3 data rows shown/);
});

test("the code face numbers its lines, one number per line", () => {
  const b = box();
  buildPreview(b, { source: { modality: "code", name: "a.js", bytes: 9 }, text: "one\ntwo\nthree", rawUrl: "/x" });
  const gutter = walk(b).find((n) => n.className === "pv-ln");
  assert.equal(gutter.textContent, "1\n2\n3");
});

test("no viewer for this format: a named refusal, and the hex is offered rather than passed off as a document", async () => {
  const b = box();
  let asked = 0;
  const drawn = buildPreview(b, {
    source: { modality: "binary", name: "report.docx", bytes: 84_000, magic: "zip" },
    rawUrl: "/api/raw?path=report.docx",
    hex: () => {
      asked++;
      return Promise.resolve({ rows: [{ off: 0, hex: ["50", "4b"], ascii: "PK" }] });
    },
  });
  assert.equal(drawn, "none");
  const hd = walk(b).find((n) => n.className === "pv-none-hd");
  assert.match(hd.textContent, /No preview for DOCX/);
  const sub = walk(b).find((n) => n.className === "pv-none-sub");
  assert.match(sub.textContent, /82\.0 KB/, "the size is stated in the refusal");
  assert.match(sub.textContent, /Download it/, "the refusal points at the one thing that always works");
  assert.equal(asked, 1, "the hex reader is asked exactly once");
  await Promise.resolve();
  await Promise.resolve();
  assert.ok(walk(b).some((n) => n.tagName === "table"), "the hex lands under the refusal");
});

test("a face never invents a source URL for a host other than this one", () => {
  // The seam II.13 keeps: every URL this module can produce comes from the
  // rawUrl it is handed, which the page builds as /api/raw?path=…
  const src = String(buildPreview);
  assert.ok(!/https?:\/\//.test(src), "preview.js names no remote host anywhere in its body");
});
