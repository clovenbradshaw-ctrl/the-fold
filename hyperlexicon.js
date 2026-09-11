// hyperlexicon.js — SHIM. The organ lives in eoreader7/native/organs (Phase 1 of the
// organ migration, 2026-09-02); this file only forwards it so a stale
// importer keeps resolving. New code imports the seam,
// ../eoreader7/native/organs/index.js, never this file.
// The organ's own file was renamed organs/hyperlexicon.js -> organs/notes-text.js
// on 2026-09-08 (native/organs/index.js's own header names the rename); this
// shim's target had gone stale and 404'd on every load until fixed here.
export * from "../eoreader7/native/organs/notes-text.js";
