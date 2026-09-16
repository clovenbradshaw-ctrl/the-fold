// source-door.js — the /source door and the auto-source path, kept pure so
// the walls are testable in node (P10). The ACT of saving lives in app.js
// (sourceTurn → addSource, chunked / identified / read-on-arrival /
// persisted); this module only decides WHAT to save, under WHAT name, and
// whether a pasted block is material rather than a question. New code
// imports this file — never re-derives the floor or the naming rule.
import { declaredIdentity, splitSentences } from "../eoreader7/native/organs/index.js";

/** A pasted block this large is material, not a question (user direction,
 * 2026-09-11): copy a big chunk into the composer and it becomes a source
 * of its own accord once it clears this floor. Declared, never tuned — the
 * floor is beyond any ordinary chat message, and the /source door names
 * any source explicitly when the floor should not apply. */
export const SOURCE_AUTO_MIN_CHARS = 1000;

/** Would this submitted line be treated as a pasted block rather than a
 * question? Length over the floor, and NOT a typed door: a slash-prefixed
 * line is a command whatever its length, and a command is never hijacked
 * into material. */
export function isAutoSourceCandidate(text) {
  const s = String(text ?? "");
  return s.length >= SOURCE_AUTO_MIN_CHARS && !/^\/[a-z]/i.test(s);
}

/**
 * Parse a `/source` line following the /run door's own shape: the FIRST
 * line is the command (with an optional name after it), everything after
 * it is the content, verbatim.
 *
 * Returns:
 *  - null          when the line is not a /source command at all (the
 *                  caller's door dispatch falls through)
 *  - {usage:true}  for a /source with no content after the command line
 *  - {name, text}  a successful save; name is null when the user gave none
 *                  (the caller auto-names pasted-N.txt)
 */
export function parseSourceCommand(text) {
  const raw = String(text ?? "");
  const nl = raw.indexOf("\n");
  if (nl === -1) {
    if (!/^\/source\b/i.test(raw.trim())) return null;
    return { usage: true };
  }
  const firstLine = raw.slice(0, nl).trim();
  if (!/^\/source\b/i.test(firstLine)) return null;
  const content = raw.slice(nl + 1).trim();
  if (!content) return { usage: true };
  const name = firstLine.replace(/^\/source\b/i, "").trim();
  return { name: name || null, text: content };
}

/** The next auto-name for an unnamed source, past the sources already held
 * (the paste dialog's own naming rule, kept in one place so the two doors
 * that auto-name can never drift). */
export function nextPastedName(existingNames) {
  const n = (existingNames ?? []).filter((k) => String(k).startsWith("pasted")).length;
  return n ? `pasted-${n + 1}.txt` : "pasted.txt";
}

/** A name is cut to fit a source pill and a citation line: a display budget
 * set by hand (P9), never measured against content. The cut lands on a word
 * boundary, so it can come in under this. */
export const NAME_MAX_CHARS = 48;

const slugOf = (phrase) => {
  const words = String(phrase ?? "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  let out = "";
  for (const w of words) {
    const next = out ? `${out}-${w}` : w;
    if (next.length > NAME_MAX_CHARS) break;
    out = next;
  }
  return out;
};

/**
 * nameForPaste(text, { title, existingNames }) → { name, title, giver }
 * A pasted source named from what it is, and the name says who gave it — the
 * same posture as source.js::declaredIdentity, whose giver is "the source
 * file's own declared header". In order, the first that yields a name:
 *   person        a title the person typed (the paste dialog's optional title,
 *                 or `/source <name>`): the name is theirs
 *   title-page    the text's own declared header (declaredIdentity)
 *   heading       the text's first line, when it is a heading — marked
 *                 (`# …`) or a line that ends without sentence punctuation and
 *                 has more text after it
 *   first-sentence the opening words of the first sentence, split by the
 *                 organ's splitter, so "Ulysses S." stays inside it
 *   fallback      pasted.txt / pasted-N.txt, when nothing has a letter in it
 * A name already held gets -2, -3, … so two pastes never share an address.
 */
export function nameForPaste(text, { title = null, existingNames = [] } = {}) {
  const held = new Set((existingNames ?? []).map(String));
  const unique = (stem) => { let name = `${stem}.txt`, n = 2; while (held.has(name)) name = `${stem}-${n++}.txt`; return name; };
  const given = String(title ?? "").trim();
  if (given && slugOf(given)) return { name: unique(slugOf(given)), title: given, giver: { kind: "person", rule: "person", phrase: "the title you gave it" } };
  const s = String(text ?? "").replace(/^\uFEFF/, "");
  const declared = declaredIdentity("pasted", s);
  if (declared?.title && slugOf(declared.title)) return { name: unique(slugOf(declared.title)), title: declared.title, giver: { kind: "text", rule: "title-page", phrase: declared.giver } };
  const lines = s.split(/\r?\n/);
  const firstAt = lines.findIndex((l) => l.trim());
  if (firstAt >= 0) {
    const first = lines[firstAt].trim();
    const marked = first.match(/^#{1,6}\s+(.+)$/);
    const rest = lines.slice(firstAt + 1).join("\n").trim();
    const heading = marked ? marked[1] : (rest && !/[.!?;:,]["”’)\]]*$/.test(first) ? first : null);
    if (heading && slugOf(heading)) return { name: unique(slugOf(heading)), title: null, giver: { kind: "text", rule: "heading", phrase: "the text's own first line" } };
  }
  const sentence = (splitSentences(s)[0]?.text ?? "").trim();
  if (sentence && slugOf(sentence)) return { name: unique(slugOf(sentence)), title: null, giver: { kind: "text", rule: "first-sentence", phrase: "the opening words of its first sentence" } };
  return { name: nextPastedName([...held]), title: null, giver: { kind: "text", rule: "fallback", phrase: "nothing in it to name it by" } };
}

/** A one-line preview of a saved block, for the transcript — the full text
 * IS the source; the transcript shows where a pasted block came from, not
 * a second copy of it. */
export function previewSavedText(text, { limit = 140 } = {}) {
  const first = String(text ?? "").split("\n", 1)[0].trim();
  if (!first) return "(no visible first line)";
  if (first.length <= limit) return first;
  return first.slice(0, limit) + "…";
}