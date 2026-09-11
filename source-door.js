// source-door.js — the /source door and the auto-source path, kept pure so
// the walls are testable in node (P10). The ACT of saving lives in app.js
// (sourceTurn → addSource, chunked / identified / read-on-arrival /
// persisted); this module only decides WHAT to save, under WHAT name, and
// whether a pasted block is material rather than a question. New code
// imports this file — never re-derives the floor or the naming rule.

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

/** A one-line preview of a saved block, for the transcript — the full text
 * IS the source; the transcript shows where a pasted block came from, not
 * a second copy of it. */
export function previewSavedText(text, { limit = 140 } = {}) {
  const first = String(text ?? "").split("\n", 1)[0].trim();
  if (!first) return "(no visible first line)";
  if (first.length <= limit) return first;
  return first.slice(0, limit) + "…";
}