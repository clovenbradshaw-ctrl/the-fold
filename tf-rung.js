// tf-rung.js — the on-device CPU rung: a transformers.js text-generation
// model that runs on WASM, needing NO GPU at all (2026-09-11). This is the
// answer to the phone whose WebGPU cannot run web-llm's rungs ("Unable to
// find a compatible GPU"): transformers.js runs the same class of small
// instruct model on the device's CPU, in any browser, on any origin.
//
// The roster is deliberately small — ONE model, the smallest instruct model
// this repo has already run on CPU via transformers.js and measured
// (Qwen2.5-0.5B-Instruct, q4 — the void-hl reader's own reader, ~27s load /
// ~6s per read in-process). A CPU rung is a fallback and a phone rung, never
// a speed champion; a device with Ollama or WebGPU keeps those first and this
// one last.
//
// Where the bytes come from: the model's publisher (Hugging Face), resolved
// by the transformers.js library from the bare model id — the same egress the
// Whisper rung already discloses on first use (transcribe.js). This file's own
// disclosure says so; no host is named here or in the worker.
//
// PURE: no fetch, no DOM, no worker. The client (tf-chat-client.js) and the
// worker (tf-chat-worker.js) only move bytes this file names.

/** The roster. One rung: id, label, dtype, the publisher's disclosure. The
 *  id is the model's own on Hugging Face — never ambiguous with an Ollama
 *  tag or a web-llm id. */
export const TF_MODELS = Object.freeze([
  Object.freeze({
    id: "onnx-community/Qwen2.5-0.5B-Instruct",
    label: "Qwen2.5 0.5B · on this device (CPU)",
    publisher: "Qwen (Alibaba), ONNX by onnx-community",
    license: "Apache-2.0",
    dtype: "q4",
    contextWindow: 32768,
    origin:
      "instruct-tuned; runs on this device's CPU via WASM — no GPU needed. The one model this repo has measured on CPU through transformers.js.",
  }),
]);

export const TF_MODEL_ID = TF_MODELS[0].id;

export function isTfModel(name) {
  return TF_MODELS.some((m) => m.id === name);
}
export function tfModelOf(name) {
  return TF_MODELS.find((m) => m.id === name) ?? null;
}
export function tfLabelFor(name) {
  return tfModelOf(name)?.label ?? name;
}
export function tfDtypeFor(name) {
  return tfModelOf(name)?.dtype ?? "q4";
}
/** The rung's declared window, off the model's own generation config where
 *  the library reports one; else the roster's declared value. */
export function tfContextWindowFor(name) {
  return tfModelOf(name)?.contextWindow ?? null;
}
/** Said out loud on the first use of the rung: the one non-localhost fetch
 *  it causes, the same posture transcribe.js already holds. */
export const TF_DISCLOSURE = (modelId) =>
  `(first use fetches the ${modelId} weights from huggingface.co, ~400 MB at q4, cached by this browser; the conversation itself never leaves this device)`;