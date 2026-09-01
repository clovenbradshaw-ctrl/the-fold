// model-routing.js — which model answers which turn. Pure, browser-safe.
//
// The picker is four rungs, fastest first. The fold's argument (P2) is that
// a modest model with a bounded context carries a plain turn; the model the
// user chose is reserved for the turns that need its headroom — /task,
// decomposed multi-anchor questions, /bound, /reflect. The summary refresh
// is grammar-constrained bookkeeping and always uses the fastest rung.
//
// "Fastest" is never a promise about a model that is not here: routing
// resolves against the OFFERED list (what Ollama actually has pulled), so a
// missing fast rung degrades to the next one loaded instead of naming a
// model that would fail on first use.

// Amended 2026-09-01: the fastest rung is what FLAT/SUMMARY route to
// regardless of what the user picks (below), so it is what most turns
// actually run on — gemma2:2b swapped for olmo-3:7b, an instruction-tuned
// model whose training data (Dolma 3) and process are fully published by
// its maker (Ai2), rather than an undisclosed mix. The DEEP-tier rung
// (qwen2.5:14b) is untouched: no ethically-sourced model at that headroom
// is pulled on this machine, so replacing it would be a downgrade dressed
// as a swap, not a real one.
export const MODEL_PICKER = [
  "olmo-3:7b",
  "qwen3:4b",
  "qwen3:8b",
  "qwen2.5:14b-instruct-q4_K_M",
];

export const ROUTE_KINDS = Object.freeze({
  /** The grammar-constrained summary refresh after every token-spending turn. */
  SUMMARY: "summary",
  /** A plain chat turn: one part, no task, nothing the small model can't carry. */
  FLAT: "flat",
  /** Work that spends the user's chosen model: /task, decomposed, /bound, /reflect. */
  DEEP: "deep",
});

/**
 * Resolve the model for a call of `kind`. `offered` is the picker rungs that
 * are actually loaded, in picker order (fastest first); `selected` is the
 * model the user chose in the picker.
 */
export function routeModel(kind, { offered = [], selected = null } = {}) {
  const fast = offered[0] ?? MODEL_PICKER[0];
  if (kind === ROUTE_KINDS.SUMMARY || kind === ROUTE_KINDS.FLAT) return fast;
  return selected ?? fast;
}

// S1/S2 (app.js's twoPassTurn) each want ONE fixed model chosen for the
// pass's actual job — a separate axis from the speed/headroom ladder
// above, not a fifth rung on it. S1 drafts before any material exists
// (no retrieval, nothing to cite): a general instruction-following
// model. S2 IS holonicTurn — reading retrieved passages and checking or
// citing claims against them — exactly Pleias-RAG-1B's own trained
// specialty (RAG, source summarization with citation), and far smaller
// than a general model would need to be for that one narrow job. User
// direction, 2026-09-01: fit the model to the pass, not the ladder. This
// supersedes twoPassTurn's original 2026-08-19 design (one model held
// constant across both passes, to isolate whether the apparatus itself
// earns its cost from a model-size confound) — that question is settled
// by now; this fits the model to the work instead.
export const S1_MODEL = "olmo-3:7b";
export const S2_MODEL = "hf.co/PleIAs/Pleias-RAG-1B-gguf:latest";

/**
 * The named model if Ollama actually has it pulled (`available`, the
 * full raw set fillModels() sees — not `offered`, which is filtered to
 * MODEL_PICKER's four rungs and would never contain either of these).
 * Falls back to the fastest offered picker rung, never a name that would
 * fail on first use — the same discipline routeModel already holds.
 */
export function resolveNamedModel(name, { available = new Set(), offered = [] } = {}) {
  if (available.has(name)) return name;
  return offered[0] ?? MODEL_PICKER[0];
}
