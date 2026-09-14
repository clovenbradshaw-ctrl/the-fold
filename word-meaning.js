// word-meaning.js — the OMNILINGUAL mechanical word-meaning organ, composed
// from RECEIVED, LANGUAGE-DECLARED priors. Each prior is a vendored plain
// JSON (built offline from the internet, loaded by the browser as bytes —
// zero egress, zero model calls). The layers, in order:
//
//   folded   — the fold's own diacritics + token folding (already in tokenize)
//   morphology — UniMorph (createLemmatizer({ language })) — same lemma
//   synsets  — the vendored WordNet/OMW synsets ({ language }) — same synset
//   values   — CLDR via Intl (plato-forms) — same date/number value
//
// `sameMeaning(a, b, { language })` — does the pair participate in one form,
// through ANY admitted layer? A pair no layer admits is the typed gap —
// honest, mechanical, omnilingual.

import { foldDiacritics } from "../the-fold/source.js";

const fold = (s) => foldDiacritics(String(s ?? "")).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

let _synsets = null;
/** load the vendored synset JSON once. `path` is injected so node tests and
 *  the browser seam can each name their own file. */
export function loadSynsets(path, { fetch = null, readFileSync = null } = {}) {
  if (_synsets) return _synsets;
  if (fetch) {
    // browser: fetch the vendored JSON (relative — no host)
    return _synsets; // browser path is wired by the seam; keep sync here
  }
  if (readFileSync && path) {
    _synsets = JSON.parse(readFileSync(path, "utf8"));
  }
  return _synsets;
}

/**
 * makeWordMeaning({ morphology, synsets, values, foldFn }) → sameMeaning.
 *   morphology(a, b) — the engine's sameAct (UniMorph, language-declared)
 *   synsets(word)    — the vendored synset table for the declared language
 *   values(a, b)     — the CLDR value resolver (plato-forms)
 * Each layer is optional; an absent layer is skipped, never a gap by itself.
 */
export function makeWordMeaning({ morphology = null, synsets = null, values = null } = {}) {
  const synMembers = (w) => {
    if (typeof synsets !== "function") return [];
    try {
      const wf = fold(w);
      const entries = synsets(wf);
      if (!entries) return [];
      const out = new Set();
      for (const e of entries) for (const s of e?.syn ?? []) out.add(fold(s));
      for (const e of entries) for (const d of e?.deriv ?? []) out.add(fold(d));
      return [...out];
    } catch { return []; }
  };

  /** Are `a` and `b` the same meaning, mechanically? Returns {same, via}. */
  function sameMeaning(a, b) {
    const fa = fold(a), fb = fold(b);
    if (fa === fb) return { same: true, via: "folded" };
    if (typeof morphology === "function") {
      try { if (morphology(fa, fb)) return { same: true, via: "morphology" }; } catch { /* skip */ }
    }
    const ma = synMembers(fa), mb = synMembers(fb);
    if (ma.length && ma.includes(fb)) return { same: true, via: "synset" };
    if (mb.length && mb.includes(fa)) return { same: true, via: "synset" };
    // two words in the SAME synset (both members of a shared synset)
    if (ma.length && mb.length) {
      const shared = ma.find((m) => mb.includes(m));
      if (shared) return { same: true, via: `synset (${shared})` };
    }
    if (typeof values === "function") {
      try {
        const va = values(a), vb = values(b);
        if (va && vb && va.value && va.value === vb.value) return { same: true, via: "value" };
      } catch { /* skip */ }
    }
    return { same: false, via: "no_layer" };
  }

  return { sameMeaning };
}