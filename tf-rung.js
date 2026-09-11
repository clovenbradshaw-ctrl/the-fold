// tf-rung.js — the on-device CPU rungs: transformers.js text-generation
// models that run on WASM, needing NO GPU at all (2026-09-11). This is the
// answer to the phone whose WebGPU cannot run web-llm's rungs ("Unable to
// find a compatible GPU"): transformers.js runs small instruct models on the
// device's CPU, in any browser, on any origin.
//
// The roster is a LADDER, not a catalog — two rungs, both Qwen2.5 (Apache-2.0,
// instruct-tuned, ONNX by onnx-community, q4), chosen for what a phone CPU
// can actually carry, each verified to exist with a real q4 ONNX and a chat
// template on the publisher (checked 2026-09-11):
//   0.5B  — the smallest this repo has measured through transformers.js
//           (the void-hl reader's own model); the fast default.
//   1.5B  — the best quality a phone can realistically run; the slowest.
// DELIBERATELY NO MODEL WITH ITS OWN THINKING MODE (user direction
// 2026-09-11): a Qwen3 0.6B trial generated a `<|think|>` deliberation
// preamble on every answer — the model reasoning against the instrument's
// own holon notes, and the fold's notes-based thinking measured better. The
// rungs answer DIRECTLY; the void, the grounding ladder and the notes are
// the thinking, and nothing competes with them.
// A CPU rung is a fallback and a phone rung, never a speed champion; a
// device with Ollama or WebGPU keeps those first and these last.
//
// Where the bytes come from: each model's publisher (Hugging Face), resolved
// by the transformers.js library from the bare model id — the same egress
// the Whisper rung already discloses on first use (transcribe.js). The
// disclosure is stated out loud per model (size at q4) and the download is
// surfaced as a banner on the page.
//
// PURE: no fetch, no DOM, no worker. The client (tf-chat-client.js) only
// moves bytes this file names.

/** The roster, smallest first. `sizeMB` is the q4 download, so the disclosure
 *  can say the number instead of waving at it. */
export const TF_MODELS = Object.freeze([
  Object.freeze({
    id: "onnx-community/Qwen2.5-0.5B-Instruct",
    label: "Qwen2.5 0.5B · on this device (CPU)",
    short: "Qwen2.5 0.5B",
    publisher: "Qwen (Alibaba), ONNX by onnx-community",
    license: "Apache-2.0",
    dtype: "q4",
    sizeMB: 400,
    contextWindow: 32768,
    origin: "fast, tiny, proven: the one model this repo has measured on CPU through transformers.js; answers directly — the fold's notes are the thinking",
  }),
  Object.freeze({
    id: "onnx-community/Qwen2.5-1.5B-Instruct",
    label: "Qwen2.5 1.5B · on this device (CPU)",
    short: "Qwen2.5 1.5B",
    publisher: "Qwen (Alibaba), ONNX by onnx-community",
    license: "Apache-2.0",
    dtype: "q4",
    sizeMB: 1000,
    contextWindow: 32768,
    origin: "the best quality a phone can realistically run — the slowest of the two; answers directly, the fold's notes are the thinking",
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
export function tfShortFor(name) {
  return tfModelOf(name)?.short ?? name;
}
export function tfDtypeFor(name) {
  return tfModelOf(name)?.dtype ?? "q4";
}
/** The rung's declared window. */
export function tfContextWindowFor(name) {
  return tfModelOf(name)?.contextWindow ?? null;
}
/** Said out loud when the download starts: the one non-localhost fetch this
 *  rung causes, with the actual q4 size, the same posture transcribe.js
 *  holds. The banner shows live progress; this is the plain words. */
export const TF_DISCLOSURE = (name) => {
  const m = tfModelOf(name);
  const size = m?.sizeMB ? `~${Math.round(m.sizeMB)} MB` : "~0.5 GB";
  return `(first use downloads the ${m?.short ?? name} weights, ${size} at q4, from huggingface.co — cached by this browser after; the conversation itself never leaves this device)`;
};