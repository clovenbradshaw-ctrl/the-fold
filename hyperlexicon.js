// hyperlexicon.js — SHIM. The organ lives in eoreader7/native/organs (Phase 1
// of the organ migration, 2026-09-02); this file only forwards it so a stale
// importer keeps resolving. New code imports the seam,
// ../eoreader7/native/organs/index.js, never this file.
//
// VERSION-ROBUST (2026-09-11): eoreader7 renamed the organ's file
// `hyperlexicon.js -> notes-text.js` and its export `makeHyperlexicon ->
// makeNotesText` on a `lavar-*` branch. A fold checkout can sit beside EITHER
// eoreader7 version, so this shim resolves the names through the SEAM (which
// exists and exports the organ on both) rather than a literal file path —
// the literal path 404'd and aborted the whole page's boot when the two
// checkouts disagreed. `makeHyperlexicon` is whatever the organ's real name
// is on the checkout present; `makeNotesText` mirrors it.
import * as seam from "../eoreader7/native/organs/index.js";

const organ = seam.hyperlexicon ?? seam;
export const assertionId = seam.assertionId ?? organ.assertionId;
export const recipeId = seam.recipeId ?? organ.recipeId;
export const REFUSALS = seam.HYPERLEXICON_REFUSALS ?? seam.REFUSALS ?? organ.REFUSALS;
export const VERB_CLASS = seam.VERB_CLASS ?? organ.VERB_CLASS;
export const makeHyperlexicon = seam.makeHyperlexicon ?? seam.makeNotesText ?? organ.makeHyperlexicon ?? organ.makeNotesText;
export const makeNotesText = seam.makeNotesText ?? organ.makeNotesText ?? makeHyperlexicon;