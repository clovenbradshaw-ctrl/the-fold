// tf-chat-client.js — the on-device CPU rung's runtime. The decisions live in
// tf-rung.js (pure); this file is only the machinery those decisions drive:
// the worker the pipeline runs in, and the one-shot complete() call.
//
// A worker is used so the CPU decode never janks the page; one worker per
// engine, a dead one is terminated and never reused (the same posture
// webllm-client.js holds for its GPU engine). No watchdog is needed the way
// web-llm's is: WASM has no device to be reclaimed, and a generation either
// finishes or the worker is gone — a typed error either way, never a
// forever-await the caller cannot distinguish.

import { TF_MODEL_ID, isTfModel } from "./tf-rung.js";

class TfChatClient {
  constructor() {
    this.worker = null;
    this._loading = null; // in-flight ensure(), shared by concurrent callers
  }

  get ready() {
    return this.worker !== null;
  }

  _terminate() {
    if (this.worker) {
      try { this.worker.terminate(); } catch { /* already gone */ }
      this.worker = null;
    }
  }

  /** The worker, building it if need be. Concurrent callers share one. */
  async ensure(modelId = TF_MODEL_ID) {
    if (!isTfModel(modelId)) throw new Error(`${modelId} is not an on-device CPU rung`);
    if (this.worker) return this.worker;
    if (this._loading) return this._loading;
    this._loading = (async () => {
      const w = new Worker(new URL("./tf-chat-worker.js", import.meta.url), { type: "module" });
      this.worker = w;
      return w;
    })().finally(() => { this._loading = null; });
    return this._loading;
  }

  /**
   * One generation, in complete()'s vocabulary: `messages` as assembled,
   * `json` best-effort (the worker asks for a JSON object, the caller's
   * parser is the wall), `onProgress(text, pct)` narrating the first-use
   * weight download. Returns `{text, usage}` — usage is null (the ONNX
   * runtime reports no token counts through this path), which foldPace
   * already treats as "no measurement".
   */
  async complete(messages, { maxTokens, temperature, json, model = TF_MODEL_ID, onProgress } = {}) {
    const worker = await this.ensure(model);
    return new Promise((resolve, reject) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const handler = (ev) => {
        const m = ev.data ?? {};
        if (m.id !== id) return;
        if (m.kind === "progress") { onProgress?.(m.text ?? "loading…", Number.isFinite(m.pct) ? m.pct : null); return; }
        worker.removeEventListener("message", handler);
        if (m.kind === "result") resolve({ text: m.text ?? "", usage: null });
        if (m.kind === "error") { this._terminate(); reject(new Error(m.message ?? "the on-device model failed")); }
      };
      worker.addEventListener("message", handler);
      worker.postMessage({ kind: "complete", id, messages, maxTokens: Number.isFinite(maxTokens) ? maxTokens : null, temperature, json: !!json });
    });
  }

  unload() {
    this._terminate();
  }
}

export const tfChatClient = new TfChatClient();