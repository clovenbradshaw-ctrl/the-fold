// tf-chat-client.js — the on-device CPU rungs' runtime. The decisions live in
// tf-rung.js (pure); this file is only the machinery those decisions drive:
// the worker the pipeline runs in, the load, and the one-shot complete().
//
// A worker is used so the CPU decode never janks the page; ONE engine, ONE
// model — a different rung tears the live worker down and builds a fresh one
// (the same "one engine at a time" rule webllm-client.js holds for its GPU
// engine, for the same reason: two ~1 GB models on one phone is a
// reclaimed-device failure). No watchdog is needed the way web-llm's is: WASM
// has no device to be reclaimed, and a generation either finishes or the
// worker is gone — a typed error either way.
//
// `preload()` is what makes the download EXPLICIT (2026-09-11): the page
// starts it the moment the rung is connected, so the weight fetch happens
// with a banner on screen, not buried inside the first turn's status line.

import { TF_MODEL_ID, isTfModel } from "./tf-rung.js";

class TfChatClient {
  constructor() {
    this.worker = null;
    this.model = null; // the model the live worker holds
    this._loading = null; // in-flight ensure(), shared by concurrent callers
    this._preload = null; // in-flight preload(), shared
  }

  get ready() {
    return this.worker !== null;
  }

  _terminate() {
    if (this.worker) {
      try { this.worker.terminate(); } catch { /* already gone */ }
      this.worker = null;
      this.model = null;
    }
  }

  /** The worker for ONE model, building it if need be. A different rung
   *  tears the previous worker down before the next loads. */
  async ensure(modelId = TF_MODEL_ID) {
    if (!isTfModel(modelId)) throw new Error(`${modelId} is not an on-device CPU rung`);
    if (this.worker && this.model === modelId) return this.worker;
    if (this._loading) return this._loading;
    this._terminate();
    this._loading = (async () => {
      const w = new Worker(new URL("./tf-chat-worker.js", import.meta.url), { type: "module" });
      this.worker = w;
      this.model = modelId;
      return w;
    })().finally(() => { this._loading = null; });
    return this._loading;
  }

  /**
   * Load the model now (not on the first generation): `onProgress(text, pct)`
   * narrates the weight download into the page's banner, and the promise
   * resolves once the model is ready. The conversation never waits for this
   * unless the first turn is already in flight.
   */
  preload({ model = TF_MODEL_ID, onProgress } = {}) {
    if (this._preload) return this._preload;
    this._preload = (async () => {
      const worker = await this.ensure(model);
      await new Promise((resolve, reject) => {
        const id = `load-${Date.now()}`;
        const handler = (ev) => {
          const m = ev.data ?? {};
          if (m.id !== id) return;
          if (m.kind === "progress") { onProgress?.(m.text ?? "weights", Number.isFinite(m.pct) ? m.pct : null); return; }
          worker.removeEventListener("message", handler);
          if (m.kind === "loaded") resolve();
          if (m.kind === "error") { this._terminate(); reject(new Error(m.message ?? "the on-device model failed to load")); }
        };
        worker.addEventListener("message", handler);
        worker.postMessage({ kind: "load", id, model });
      });
    })().finally(() => { this._preload = null; });
    return this._preload;
  }

  /**
   * One generation, in complete()'s vocabulary: `messages` as assembled,
   * `json` best-effort (the worker asks for a JSON object, the caller's
   * parser is the wall), `onProgress(text, pct)` narrating a not-yet-loaded
   * model. Returns `{text, usage}` — usage is null (the ONNX runtime reports
   * no token counts through this path), which foldPace already treats as
   * "no measurement".
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
      worker.postMessage({ kind: "complete", id, model, messages, maxTokens: Number.isFinite(maxTokens) ? maxTokens : null, temperature, json: !!json });
    });
  }

  unload() {
    this._terminate();
  }
}

export const tfChatClient = new TfChatClient();