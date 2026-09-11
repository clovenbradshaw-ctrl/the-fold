// hyperlexicon.js — SHIM. The organ lives in eoreader7/native/organs (Phase 1 of the
// organ migration, 2026-09-02); this file only forwards it so a stale
// importer keeps resolving. New code imports the seam,
// ../eoreader7/native/organs/index.js, never this file.
// The organ's own file was renamed organs/hyperlexicon.js -> organs/notes-text.js
// on 2026-09-08 (native/organs/index.js's own header names the rename); this
// shim's target had gone stale and 404'd on every load until fixed here.
// The rename also renamed the export itself, makeHyperlexicon -> makeNotesText
// (native/organs/index.js's own header: "notes-text.js is its text face —
// renamed 2026-09-08 from hyperlexicon.js"). A bare `export *` re-exports
// the new name only, so app.js's own `import { makeHyperlexicon } from
// "./hyperlexicon.js"` (~30 local uses of hyperlexiconFor downstream) failed
// module linking on every load — "does not provide an export named
// 'makeHyperlexicon'" — which aborted boot before the theme toggle, the
// page-tabs sizing, and everything else after it in app.js ever ran. The
// alias below is what keeps this shim's own name true to its file name.
export { makeNotesText as makeHyperlexicon } from "../eoreader7/native/organs/notes-text.js";
export * from "../eoreader7/native/organs/notes-text.js";
