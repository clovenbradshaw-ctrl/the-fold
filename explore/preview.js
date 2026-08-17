// preview.js — the file's own face, in whatever format the file actually is.
//
// The reading surfaces (cast, relations, graph, trace) are what this
// instrument is FOR, but they are not what a reader wants first. First they
// want to see the thing: the image as an image, the spreadsheet as a table,
// the page as a page, the PDF in a viewer. That is this module — a preview
// that shows the bytes in their own clothes and says, out loud, which face it
// is showing and what that face cannot carry.
//
// Two rules it obeys, inherited:
//
//   - Nothing is loaded from any host but this one (II.13). Every source URL
//     here is a `/api/raw?path=…` on the local server; the HTML face is an
//     iframe with an EMPTY sandbox, so a saved page cannot run a script or
//     reach the network even in principle.
//   - A cap is never silent (P4's spirit). Every face that shows less than the
//     whole file counts what it dropped next to what it kept.
//
// It is deliberately fetch-free and `document`-free at module scope: the
// caller passes the text it already has, a `hex` reader for the binary face,
// and the DOM is built through `box.ownerDocument` — the same seam render.js
// uses, so the whole thing runs under node --test against a stub document.

/** Display caps. Declared, and every one of them is counted out loud below. */
export const TABLE_ROW_CAP = 500;
export const CODE_LINE_CAP = 4000;

/**
 * Which face fits this source — by the modality the server sniffed, never by
 * guessing at content. `none` is an honest answer: a .docx is a zip of XML
 * and this page has no viewer for it, so it says so and offers the bytes
 * rather than pretending a hex dump is a document.
 */
export function previewFace(source) {
  const m = source?.modality ?? "binary";
  if (m === "image") return "image";
  if (m === "audio") return "audio";
  if (m === "video") return "video";
  if (m === "pdf") return "pdf";
  if (m === "html") return "html";
  if (m === "markdown") return "markdown";
  if (m === "table") return "table";
  if (m === "json" || m === "code") return "code";
  if (m === "text") return "text";
  return "none";
}

/** What each face claims to be showing, in one sentence, for the footer. */
export const FACE_NOTE = {
  image: "the image, as the browser decodes it",
  audio: "the audio stream, as the browser plays it",
  video: "the video stream, as the browser plays it",
  pdf: "the PDF, in the browser's own viewer",
  html: "the page rendered inert — an empty sandbox, so no script runs and nothing loads",
  markdown: "the markdown rendered; the raw toggle shows the bytes it was rendered from",
  table: "the rows as they are delimited on disk",
  code: "the text as it sits on disk, decoded as UTF-8, with its own line numbers",
  text: "the text as it sits on disk, decoded as UTF-8",
  none: "no viewer on this page can render this format — the bytes are here to download, and the hex is below",
};

/**
 * Delimited text to rows, quotes honoured, stopping once `rowCap` data rows
 * are in hand. Returns the total line count too, so the caller can say how
 * many rows exist beyond the cap rather than implying there are none.
 *
 * Shared with the Field view's table face so the desk and the reader parse a
 * CSV exactly one way (the fold-once discipline: one implementation of "the
 * same rows", never two that can drift).
 */
export function parseDelimited(text, delim = ",", rowCap = TABLE_ROW_CAP) {
  const rows = [];
  let cur = [""];
  let inQ = false;
  for (let i = 0; i < text.length && rows.length <= rowCap; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur[cur.length - 1] += '"';
          i++;
        } else inQ = false;
      } else cur[cur.length - 1] += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) cur.push("");
    else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
      if (ch === "\r") i++;
      rows.push(cur);
      cur = [""];
    } else cur[cur.length - 1] += ch;
  }
  if (cur.length > 1 || cur[0]) rows.push(cur);
  const lines = (text.match(/\n/g)?.length ?? 0) + (text.endsWith("\n") ? 0 : 1);
  const totalDataRows = Math.max(0, lines - 1);
  const [head = [], ...body] = rows;
  return { head, body: body.slice(0, rowCap), totalDataRows, dropped: Math.max(0, totalDataRows - Math.min(body.length, rowCap)) };
}

/**
 * Lines, capped, with the drop counted. A 300k-line log is a legitimate thing
 * to preview; drawing every line of it into the DOM is not.
 */
export function capLines(text, cap = CODE_LINE_CAP) {
  const all = text.split("\n");
  return { lines: all.slice(0, cap), total: all.length, dropped: Math.max(0, all.length - cap) };
}

const bytesWord = (n) => (n == null ? "" : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

/**
 * Build the face into `box`.
 *
 * ctx:
 *   source   — the /api/source result (modality, bytes, delimiter, magic…)
 *   text     — decoded text, for the textual faces (null otherwise)
 *   rawUrl   — the local URL for the bytes themselves
 *   raw      — show the bytes instead of the rendered face (markdown/html)
 *   markdown — (holder, text) => void, the page's own markdown renderer
 *   hex      — optional () => Promise<{rows, offset, length, total}> for `none`
 *
 * Returns the face it drew, so the caller can label what it is looking at
 * without re-deriving the decision.
 */
export function buildPreview(box, ctx) {
  const doc = box.ownerDocument ?? globalThis.document;
  const el = (tag, cls, text) => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const s = ctx.source;
  const face = previewFace(s);
  const said = (words) => box.appendChild(el("div", "pv-said", words));

  if (face === "image") {
    const img = el("img", "pv-img");
    img.src = ctx.rawUrl;
    img.alt = s.name ?? "";
    box.appendChild(img);
    return face;
  }
  if (face === "audio" || face === "video") {
    const m = el(face, "pv-media");
    m.controls = true;
    m.src = ctx.rawUrl;
    box.appendChild(m);
    return face;
  }
  if (face === "pdf") {
    const f = el("iframe", "pv-frame");
    f.src = ctx.rawUrl;
    box.appendChild(f);
    return face;
  }
  if (face === "html" && !ctx.raw) {
    const f = el("iframe", "pv-frame");
    // Empty sandbox: no scripts, no same-origin, no forms — a picture of the
    // page, which is the only honest way to show a page you did not write.
    f.setAttribute("sandbox", "");
    if (ctx.text != null) f.srcdoc = ctx.text;
    else f.src = ctx.rawUrl;
    box.appendChild(f);
    return face;
  }
  if (face === "markdown" && !ctx.raw && ctx.markdown) {
    const holder = el("div", "pv-md");
    ctx.markdown(holder, ctx.text ?? "");
    box.appendChild(holder);
    return face;
  }
  if (face === "table" && ctx.text != null) {
    const { head, body, totalDataRows, dropped } = parseDelimited(ctx.text, s.delimiter ?? ",");
    const wrap = el("div", "pv-tblwrap");
    const tbl = el("table", "tbl");
    const trh = el("tr");
    for (const h of head) trh.appendChild(el("th", null, h));
    tbl.appendChild(trh);
    for (const r of body) {
      const tr = el("tr");
      for (const c of r) tr.appendChild(el("td", null, c));
      tbl.appendChild(tr);
    }
    wrap.appendChild(tbl);
    box.appendChild(wrap);
    said(`${(totalDataRows - dropped).toLocaleString()} of ${totalDataRows.toLocaleString()} data rows shown${dropped ? ` — ${dropped.toLocaleString()} beyond the display cap` : ""}`);
    return face;
  }
  if ((face === "code" || (ctx.raw && (face === "markdown" || face === "html"))) && ctx.text != null) {
    const { lines, total, dropped } = capLines(ctx.text);
    const wrap = el("div", "pv-code");
    wrap.appendChild(el("pre", "pv-ln", lines.map((_, i) => i + 1).join("\n")));
    wrap.appendChild(el("pre", "pv-src", lines.join("\n")));
    box.appendChild(wrap);
    if (dropped) said(`${lines.length.toLocaleString()} of ${total.toLocaleString()} lines shown — ${dropped.toLocaleString()} beyond the display cap`);
    return ctx.raw ? "raw" : face;
  }
  if (face === "text" && ctx.text != null) {
    const { lines, total, dropped } = capLines(ctx.text);
    box.appendChild(el("div", "pv-text", lines.join("\n")));
    if (dropped) said(`${lines.length.toLocaleString()} of ${total.toLocaleString()} lines shown — ${dropped.toLocaleString()} beyond the display cap`);
    return face;
  }

  // No viewer. This is a refusal with a reason and two ways forward, not a
  // blank pane: the bytes are downloadable, and the hex dump underneath is
  // the one face every file has.
  const none = el("div", "pv-none");
  none.appendChild(el("div", "pv-none-glyph", "▨"));
  none.appendChild(el("div", "pv-none-hd", `No preview for ${(s.name ?? "").split(".").pop().toUpperCase()} on this page`));
  none.appendChild(el("div", "pv-none-sub", `${bytesWord(s.bytes)}${s.magic ? ` · ${s.magic}` : ""} · nothing here can render this format, so nothing here pretends to. Download it to open in an app that can.`));
  box.appendChild(none);
  if (ctx.hex) {
    const hexBox = el("div", "pv-hex");
    hexBox.appendChild(el("div", "pv-said", "the first bytes, in hex — the one face every file has"));
    box.appendChild(hexBox);
    ctx
      .hex()
      .then((page) => {
        const tbl = el("table");
        for (const row of page.rows ?? []) {
          const tr = el("tr");
          tr.appendChild(el("td", "off", row.off.toString(16).padStart(8, "0")));
          tr.appendChild(el("td", null, row.hex.join(" ")));
          tr.appendChild(el("td", "asc", row.ascii));
          tbl.appendChild(tr);
        }
        hexBox.appendChild(tbl);
      })
      .catch(() => hexBox.appendChild(el("div", "pv-said", "the hex reader did not answer for this file")));
  }
  return "none";
}
