// source.js — the address half.
//
// A System 2 record is only worth more than a paraphrase because its refs can
// be read back. That requires material with addresses, so this module holds
// the smallest honest version of one: paste text, it is chunked at paragraph
// boundaries, every chunk knows its byte range, and retrieval is mechanical
// term overlap. No model chooses anything here.
//
// Two rules this module exists to obey:
//   - The model does not get tools. Whether a turn retrieves is a
//     deterministic function of the question's own words, not a decision the
//     model makes.
//   - Whatever cannot be addressed is a typed gap, never a guess. A chunk with
//     no term overlap is simply absent; nothing is invented to fill it.

const STOPWORDS = new Set(
  ("a an and are as at be but by for from had has have he her his i in into is it its of on or " +
    "our she that the their them there these they this to was were what when where which who why " +
    "will with would you your do does did can could should about would're not no if then than so " +
    "how me my we us been being over under after before also just like more most some such only").split(" "),
);

/**
 * Diacritics are folded away before splitting. A corpus can be accented where
 * the question is not — a Project Gutenberg text writes "Natásha" 1,213 times,
 * and a reader asking about Natasha would otherwise be told, with all of War
 * and Peace loaded, that there is no mention of her. That failure looks like
 * the retrieval working and the material lacking, which is the worst shape a
 * bug can take here.
 */
export function tokenize(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9%.\-]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/**
 * Chunk a document at blank lines, keeping each chunk's byte range in the
 * original string. Ranges are half-open [start, end) and index the exact
 * string readRange is given back, which is what makes a ref re-openable.
 */
export function chunkSource(name, text) {
  if (looksDelimited(name, text)) return chunkRows(name, text);
  const chunks = [];
  const re = /\n\s*\n/g;
  let start = 0;
  let m;
  const push = (from, to) => {
    const body = text.slice(from, to);
    if (body.trim().length < 20) return;
    chunks.push({
      source: name,
      start: from,
      end: to,
      text: body.trim(),
      ref: `${name}#${from}-${to}`,
      terms: new Set(tokenize(body)),
    });
  };
  while ((m = re.exec(text))) {
    push(start, m.index);
    start = re.lastIndex;
  }
  push(start, text.length);
  return chunks;
}

/** Rows per addressable passage, unless the rows are long enough to fill it. */
const ROWS_PER_CHUNK = 8;
const ROW_CHUNK_CHARS = 1200;

/**
 * A spreadsheet has no blank lines, so paragraph chunking makes the whole file
 * one passage: nothing can be retrieved from it and nothing in it can be
 * cited. Delimited files are admitted by row instead.
 */
function looksDelimited(name, text) {
  if (/\.(csv|tsv)$/i.test(name)) return true;
  const first = text.slice(0, text.indexOf("\n") + 1 || 400);
  const second = text.slice(first.length, first.length + 400).split("\n")[0];
  const count = (s, ch) => s.split(ch).length - 1;
  for (const ch of [",", "\t", ";"]) {
    const a = count(first, ch);
    if (a >= 3 && a === count(second, ch)) return true;
  }
  return false;
}

/**
 * Row groups, with the byte range covering exactly the rows and nothing else —
 * so a ref still reads back precisely what it names. The header travels beside
 * the passage rather than inside it: the model needs the column names to read
 * the rows, and splicing them into the text would make the passage disagree
 * with the bytes at its own address.
 */
function chunkRows(name, text) {
  const nl = text.indexOf("\n");
  const header = nl === -1 ? text : text.slice(0, nl);
  const headerTerms = tokenize(header);
  const chunks = [];

  let start = nl + 1;
  let rows = 0;
  let cursor = start;
  const flush = (end) => {
    const body = text.slice(start, end);
    if (body.trim()) {
      chunks.push({
        source: name,
        start,
        end,
        text: body.replace(/\n$/, ""),
        header,
        ref: `${name}#${start}-${end}`,
        terms: new Set([...tokenize(body), ...headerTerms]),
      });
    }
    start = end;
    rows = 0;
  };

  while (cursor < text.length) {
    const next = text.indexOf("\n", cursor);
    const lineEnd = next === -1 ? text.length : next + 1;
    rows++;
    if (rows >= ROWS_PER_CHUNK || lineEnd - start >= ROW_CHUNK_CHARS) flush(lineEnd);
    cursor = lineEnd;
  }
  if (cursor > start) flush(cursor);
  return chunks;
}

/** Read a ref back out of the material it addresses. The re-opening. */
export function readRange(sources, ref) {
  const m = String(ref).match(/^(.*)#(\d+)-(\d+)$/);
  if (!m) return null;
  const [, name, from, to] = m;
  const doc = sources[name];
  if (typeof doc !== "string") return null;
  return doc.slice(Number(from), Number(to));
}

/**
 * Mechanical retrieval: score every chunk by how many of the question's own
 * terms it carries, rank, take the top few. There is no relevance floor to
 * pick — a chunk either shares a term with the question or it does not, and a
 * chunk that shares none is simply absent from the result. Nothing is invented
 * to fill the gap and no cutoff is asserted that the material did not supply.
 */
export function retrieve(chunks, question, limit = 3, foldedRefs = []) {
  const qTerms = [...new Set(tokenize(question))];
  if (!qTerms.length) return [];
  const folded = new Set(foldedRefs);
  const scored = chunks
    .map((c) => {
      const hits = qTerms.filter((t) => c.terms.has(t)).length;
      // A passage already folded into an earlier turn's record is
      // deprioritized, not excluded: it has been read once already, and a turn
      // that keeps re-reading the same paragraph is not making progress. Half
      // its own score rather than a fixed subtraction, so the penalty stays
      // proportional to how relevant the passage was in the first place.
      const score = folded.has(c.ref) ? hits / 2 : hits;
      return { chunk: c, hits, score };
    })
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.score - a.score || a.chunk.start - b.chunk.start);
  return scored.slice(0, limit).map((s) => s.chunk);
}

export function buildSourceBlock(chunks) {
  if (!chunks.length) return null;
  const parts = [
    "MATERIAL — the passages retrieved for this turn, each with the address it was read from. Answer from these when they cover the question, and cite the address in brackets exactly as written. If they do not cover it, say so rather than filling the gap.",
  ];
  for (const c of chunks)
    parts.push(
      c.header ? `[${c.ref}]\ncolumns: ${c.header}\n${c.text}` : `[${c.ref}]\n${c.text}`,
    );
  return parts.join("\n\n");
}

/**
 * Mechanical grounding check. Every bracketed address the answer cites is
 * checked against the addresses actually handed to it this turn; a citation
 * naming material that was never retrieved is unsupported. This is a check on
 * the address, not on the truth of the sentence — which is exactly why it can
 * run without a model.
 */
export function checkCitations(answer, chunks) {
  const offered = new Set(chunks.map((c) => c.ref));
  const cited = [...String(answer).matchAll(/\[([^\]\s]+#\d+-\d+)\]/g)].map(
    (m) => m[1],
  );
  const used = [...new Set(cited.filter((r) => offered.has(r)))];
  const unsupported = [...new Set(cited.filter((r) => !offered.has(r)))];
  return { used, unsupported, cited: [...new Set(cited)] };
}

/**
 * What the turn could not settle. Mechanical: material was retrieved but the
 * answer cited none of it, or no material was retrieved at all for a question
 * that had terms to match on.
 */
export function openQuestions(question, chunks, used) {
  const open = [];
  if (!chunks.length && tokenize(question).length)
    open.push(`no material matched: ${truncateOne(question, 120)}`);
  else if (chunks.length && !used.length)
    open.push(`material retrieved but uncited: ${truncateOne(question, 120)}`);
  return open;
}

function truncateOne(s, n) {
  const t = String(s || "").trim();
  return t.length > n ? t.slice(0, n - 3) + "..." : t;
}
