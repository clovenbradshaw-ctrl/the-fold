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
// Amended 2026-09-02, user direction, verbatim: "we've found that the
// thinking part of a local model is way shittier than our own reasoning,
// and we gave up on using actual 'reasoning' models" — then "use way
// smaller models". Measured the same day: olmo-3:7b spent 160s at 7 tok/s
// on a grounded question and ran out its budget inside its own thinking
// pass, never answering. The fold's mechanics carry the reasoning (the
// void, the grounding ladder, the corroboration walk); the model reads and
// points. So the rungs are small INSTRUCT models, fastest first, no
// thinking-mode model anywhere on the ladder (olmo-3, qwen3, deepseek-r1
// all out). The 14b instruct stays as the one DEEP rung a person can
// still choose by hand; nothing routes to it on its own. The ethical-
// sourcing argument of the previous amendment is real and is set aside by
// this direction, not answered by it — said here rather than deleted.
export const MODEL_PICKER = [
  "gemma2:2b",
  "llama3.2:latest",
  "phi3:mini",
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
// above, not a fifth rung on it. User direction, 2026-09-01: fit the
// model to the pass, not the ladder. This supersedes twoPassTurn's
// original 2026-08-19 design (one model held constant across both
// passes, to isolate whether the apparatus itself earns its cost from a
// model-size confound) — that question is settled by now; this fits the
// model to the work instead.
//
// First assignment (same day): S1 = olmo-3:7b, S2 = Pleias-RAG-1B — a
// RAG-specialist model for the pass that reads and cites retrieved
// passages. REVERTED after live testing (both against the real app and
// direct API calls, before any of this was wired into production code):
// Pleias-RAG-1B has no chat template at all (`ollama show ... --template`
// returns bare `{{ .Prompt }}` — it was never trained on chat turns,
// only a bespoke 19-special-token query/source/answer protocol), and
// even fed that protocol correctly it fabricated details absent from its
// source and wandered completely off-topic. The theoretical fit
// (RAG-trained) did not survive contact with the model actually running
// — S2 is the pass that catches hallucination, not one that should risk
// adding it, so raw reliability wins over topical training match.
//
// Current assignment: S1 (the easier job — a quick honest draft, no
// material yet to get wrong) gets the SMALLER model; S2 (the harder job
// — checking claims against retrieved material) gets the one already
// watched behaving well twice, at 7x the parameter count. Both are Ai2
// (Allen Institute for AI): full training data, process, and checkpoints
// published, never an undisclosed mix.
export const S1_MODEL = "hf.co/allenai/OLMo-2-0425-1B-Instruct-GGUF:latest";
// 2026-09-02: S2 follows the same direction — small instruct, no thinking pass; gemma2:2b is the
// model every corroboration and witness measurement in this repo was taken on, at temperature 0.
export const S2_MODEL = "gemma2:2b";

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
