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

export const MODEL_PICKER = [
  "gemma2:2b",
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
