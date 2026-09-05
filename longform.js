// longform.js — a PIECE asked for by its length (P108). Pure.
//
// "Write me a 30-page essay on the X-Files" is not a question; it is work
// with a declared size. The signal read here is the COUNTED property (P4):
// a length — pages or words — stated in the ask. No list of document kinds
// decides anything: the noun the length modifies ("essay", "report",
// "memo", whatever it is) is carried as `kind` for the record, never used
// to admit or refuse. The topic is what follows the ask's own "on"/"about"
// after the length phrase, or the remainder when neither is present.

export const WORDS_PER_PAGE = 500;          // a manuscript page (giver: the common editorial convention)
export const WORDS_PER_SECTION = 650;       // what one ~1,100-token draft yields on a small mouth (measured 2026-09-05, gemma2:2b)
export const PART_TOKENS = 1100;
export const MAX_SECTIONS = 40;
export const MIN_SECTIONS = 4;

const LENGTH_RE = /\b(\d{1,3}(?:,\d{3})?)\s*[- ]?\s*(pages?|words?|pg)\b(?:\s+(?:long\s+)?([a-z][a-z-]*))?/i;
const WRITE_RE = /\b(write|draft|compose|produce|author|prepare)\b/i;

/**
 * detectLongForm(question) → { pages, words, sections, kind, topic } or null.
 * Requires a writing verb AND a stated length; the length decides the size.
 */
export function detectLongForm(question) {
  const q = String(question ?? "").trim();
  if (!q || q.startsWith("/")) return null;
  if (!WRITE_RE.test(q)) return null;
  const m = q.match(LENGTH_RE);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = m[2].toLowerCase();
  const words = unit.startsWith("w") ? n : n * WORDS_PER_PAGE;
  const pages = unit.startsWith("w") ? Math.max(1, Math.round(n / WORDS_PER_PAGE)) : n;
  const kind = m[3] && !/^(on|about|regarding|covering|for|of|that|which|to)$/i.test(m[3]) ? m[3].toLowerCase() : null;
  const after = q.slice(m.index + m[0].length);
  const topicMatch = after.match(/\b(?:on|about|regarding|covering)\s+(.+)$/is) ?? q.match(/\b(?:on|about|regarding|covering)\s+(.+)$/is);
  let topic = (topicMatch ? topicMatch[1] : after).trim().replace(/[.!?\s]+$/g, "").trim();
  // A page address in the ask is the named-source path's business (P23); it is not the topic.
  topic = topic.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  if (!topic) return null;
  const sections = Math.max(MIN_SECTIONS, Math.min(MAX_SECTIONS, Math.round(words / WORDS_PER_SECTION)));
  return { pages, words, sections, kind, topic };
}

/** The task handed to the planner: the ask restated with its declared size, so the plan is sized by a number and not by appetite. */
export function longFormTask({ pages, sections, kind, topic }) {
  const piece = kind ?? "piece";
  return `Write a ${pages}-page ${piece} on ${topic}. Plan it as exactly ${sections} sections in reading order — an introduction first, a conclusion last, and between them the distinct movements of one argument; each section is a few words of label and one sentence of what it must establish. Each section is then written as continuous prose of about ${WORDS_PER_SECTION} words, in its own voice, without lists or headings inside it.`;
}
