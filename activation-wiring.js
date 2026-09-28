// activation-wiring.js — binds the activation-retrieval organ (eoreader7, the
// archon of the surf) to this surface's own dialogue and resolutions organs.
// The organ imports no surface; this is the one place the two meet, so every
// caller here keeps the names it always had.
import { bindActivationRetrieval } from "../eoreader7/native/organs/index.js";
import { referentsOf, fold } from "./dialogue.js";
import { activeReferents, dmdCut, lensCut, DECLARED_LINES } from "./resolutions.js";

export const { SENTENCE_CEILING, mentionBook, activate, makeActivationRetrieval } = bindActivationRetrieval({
  referentsOf, fold, activeReferents, dmdCut, lensCut, DECLARED_LINES,
});
