// library.js — "My files": the flat index of what a reader explicitly
// added, and nothing else. Pure logic here (folded, testable offline); the
// I/O half — the filesystem writes, the confinement checks — lives in
// explore-server.mjs, the same split web.js/explore-server.mjs already
// keeps for the web organ.
//
// THE POINT OF THIS FILE: Explore does not browse the whole machine by
// default. It starts EMPTY. A reader adds a reference to something already
// on disk (no copy) or uploads real bytes from anywhere on their OS (no
// browse-root confinement applies to that path at all — it is the
// browser's own native file picker, which this server never sees until
// bytes arrive). Either way, the add is one line in an append-only ledger;
// "My files" is the fold over that ledger, same discipline
// web.js::foldWebHistory already established for page history.

// Uploads may be larger than a text deposit (images, PDFs, audio) — a
// declared per-file cap, not a measured constant. Giver: this file.
export const LIBRARY_UPLOAD_MAX_BYTES = 150000000;

// Control characters (0x00-0x1F, 0x7F), built from char codes rather than
// a literal escape range — an escape sequence in this range has proven
// fragile to transit through tool layers in this session; codes do not.
const CONTROL_CHARS = new RegExp(
  "[" + Array.from({ length: 33 }, (_, i) => (i < 32 ? String.fromCharCode(i) : String.fromCharCode(127))).join("") + "]",
  "g",
);

/**
 * A name arriving from outside (an OS file picker, a drag-drop) carries no
 * guarantee about what characters it holds or how long it is. Strip path
 * separators and control characters (a name is a label, never a route),
 * cap length, and never return empty.
 */
export function sanitizeFileName(name) {
  const cleaned = String(name ?? "")
    .split("/")
    .join("_")
    .split("\\")
    .join("_")
    .replace(CONTROL_CHARS, "")
    .trim()
    .slice(0, 180);
  return cleaned || "upload";
}

/**
 * The library ledger is append-only IN OPERATION (an add appends its
 * entry; a remove appends a same-id tombstone) — the same shape
 * web.js::foldWebHistory already established for page history, except an
 * entry here never patches: each id is written once by "add" and at most
 * once by "remove", so last-write-wins is the whole rule, not a merge.
 * Unparseable or id-less lines are counted, never silently skipped.
 */
export function foldLibrary(jsonl) {
  const byId = new Map();
  let skipped = 0;
  for (const line of String(jsonl ?? "").split("\n")) {
    if (!line.trim()) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      skipped++;
      continue;
    }
    if (!obj || typeof obj.id !== "string" || (obj.event !== "add" && obj.event !== "remove")) {
      skipped++;
      continue;
    }
    byId.set(obj.id, obj);
  }
  const entries = [...byId.values()]
    .filter((e) => e.event === "add")
    .sort((a, b) => String(b.addedAt ?? "").localeCompare(String(a.addedAt ?? "")));
  return { entries, skipped };
}
