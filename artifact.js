// artifact.js — an answer is not always prose.
//
// When a turn produces a table, a block of code, or a page, printing it as a
// run of characters makes the reader do the rendering in their head. This
// module reads the shape off the text — mechanically, the same way retrieval
// reads relevance off the question — and hands back typed segments the page
// can render as what they are.
//
// Nothing here asks a model what format its output was in. The model already
// said, in the only way that can be checked: it wrote a fence, or it wrote a
// row of pipes.
//
// Pure: no DOM, no IO. `parseSegments` is the whole surface.

const FENCE = /^[ \t]*(?:```|~~~)[ \t]*([\w+-]*)[ \t]*$/;

/**
 * Split an answer into a list of segments:
 *   {type:"prose", text}
 *   {type:"code", lang, code}
 *   {type:"table", head:[…], rows:[[…]]}
 *
 * A fence that never closes is still a code segment — a truncated answer is
 * exactly when you most want to see the code as code.
 */
export function parseSegments(answer) {
  const lines = String(answer ?? "").split("\n");
  const out = [];
  let prose = [];

  const flushProse = () => {
    const text = prose.join("\n").trim();
    if (text) out.push({ type: "prose", text });
    prose = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const fence = lines[i].match(FENCE);
    if (fence) {
      flushProse();
      const lang = (fence[1] || "").toLowerCase();
      const body = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i])) body.push(lines[i++]);
      out.push({ type: "code", lang, code: body.join("\n") });
      continue;
    }

    const table = readTable(lines, i);
    if (table) {
      flushProse();
      out.push(table.segment);
      i = table.end;
      continue;
    }

    prose.push(lines[i]);
  }
  flushProse();
  return out;
}

/**
 * A pipe table is a header row, a delimiter row of dashes, and rows until the
 * pipes stop. The delimiter row is what distinguishes a table from a sentence
 * that happens to contain a pipe, so it is required.
 */
function readTable(lines, start) {
  const head = splitRow(lines[start]);
  if (!head) return null;
  const delim = splitRow(lines[start + 1]);
  if (!delim || !delim.length || !delim.every((c) => /^:?-{1,}:?$/.test(c.trim())))
    return null;
  if (delim.length !== head.length) return null;

  const rows = [];
  let i = start + 2;
  for (; i < lines.length; i++) {
    const row = splitRow(lines[i]);
    if (!row) break;
    // Ragged rows are kept, padded or trimmed to the header — a model that
    // drops a trailing cell should still produce a readable table.
    rows.push(
      Array.from({ length: head.length }, (_, c) => (row[c] ?? "").trim()),
    );
  }
  if (!rows.length) return null;
  return { segment: { type: "table", head: head.map((h) => h.trim()), rows }, end: i - 1 };
}

function splitRow(line) {
  if (typeof line !== "string") return null;
  const t = line.trim();
  if (!t.includes("|")) return null;
  // A row wrapped in pipes is a row even with one column; without the outer
  // pipes it needs at least two cells, so a lone pipe mid-sentence is prose.
  // Either way the delimiter row is what finally decides.
  const wrapped = t.length > 1 && t.startsWith("|") && t.endsWith("|");
  // Split on unescaped pipes only, then unescape. A cell is allowed to contain
  // a pipe — a fold line or a gist can hold anything — and without this a
  // single pipe in a value silently shifts every column after it.
  const cells = t
    .replace(/^\|/, "")
    .replace(/(?<!\\)\|$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.replace(/\\\|/g, "|"));
  return wrapped || cells.length > 1 ? cells : null;
}

/**
 * Build a table segment from data the caller already holds — the same shape
 * `parseSegments` produces from text, so both paths render identically.
 *
 * This is the half that does not go through a model at all. Retrieval results,
 * records, sources: these are rows before anything is said about them, and
 * asking a model to format rows it was handed is a round trip that can only
 * lose. `columns` is a list of {label, get}; every cell is coerced to a string
 * here so the renderer never has to think about types.
 */
export function tableFrom(items, columns) {
  const rows = [...items].map((item, i) =>
    columns.map((c) => {
      const v = c.get(item, i);
      return v == null ? "" : String(v);
    }),
  );
  return { type: "table", head: columns.map((c) => c.label), rows };
}

/** Languages whose artifact is the thing itself, rendered. */
export const RENDERABLE = new Set(["html", "svg"]);

/**
 * A page built from a code segment, for rendering inside a sandboxed frame.
 * SVG is wrapped so it fills the frame; HTML is passed through as authored.
 */
export function toDocument(seg) {
  if (seg.lang === "svg")
    return `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%;display:grid;place-items:center;background:transparent}svg{max-width:100%;max-height:100%}</style>${seg.code}`;
  return seg.code;
}
