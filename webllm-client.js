// webllm-client.js — the in-tab model's runtime. The decisions live in
// webllm-rung.js (pure, tested); this file is only the machinery those
// decisions drive: the worker the engine runs in, the load attempts, and the
// streaming call complete() consumes.
//
// Stability posture, in order of the failures actually measured in the
// sibling repos (eochat's client, eoWebLLM's laws):
//   - the engine runs in a WORKER (CreateWebWorkerMLCEngine), so shader
//     compilation doesn't jank the page and a WebGPU device the browser
//     reclaims (low memory, backgrounded tab, driver reset — web-llm#647)
//     takes the worker down, never the page. A dead worker is terminated and
//     never reused: one worker per engine, fresh per attempt.
//   - a load is attempted LOAD_ATTEMPTS times with short backoffs. The
//     download is many sharded requests; whatever the browser's cache
//     committed before a failure is kept, so a retry resumes rather than
//     restarts. After the attempts, the typed failure is thrown to the
//     caller — the fold shows it and the NEXT turn retries by construction,
//     because every call comes back through ensure().
//   - a device lost MID-ANSWER rebuilds the engine once and replays the
//     request; only a second failure in the same call reaches the caller.
//   - on a non-localhost page (the static deployment) the browser is asked
//     to persist this origin's storage before the ~1.7GB lands, so the
//     cached weights are not first in line for eviction.

import { CreateWebWorkerMLCEngine, prebuiltAppConfig } from "/node_modules/@mlc-ai/web-llm/lib/index.js";
import {
  WEBLLM_MODEL_ID,
  isWebLLMModel,
  appConfigFor,
  weightsBases,
  readMirrors,
  weightsProbeUrl,
  classifyWebLLMFailure,
  isLocalPage,
  toWebLLMRequest,
  paceRecordFromUsage,
  LOAD_ATTEMPTS,
  LOAD_BACKOFF_MS,
  ENGINE_FIRST_LIFE_MS,
  ENGINE_QUIET_MS,
  engineStalledError,
} from "./webllm-rung.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Await `promise`, but treat silence past `ms` as the engine being gone —
 * the watchdog webllm-rung.js's budgets exist for. The timer is cleared on
 * either outcome, so a healthy engine costs one setTimeout per await. */
async function withLife(promise, ms, phase) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(engineStalledError(ms, phase)), ms);
  });
  try {
    return await Promise.race([promise, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

class WebLLMClient {
  constructor() {
    this.engine = null;
    this.worker = null;
    this.modelId = null; // the id the live engine holds; a different id unloads it
    this._loading = null; // in-flight ensure(), shared by concurrent callers
    this._loadingId = null;
    const { appConfig, weights, contextWindow, contextWindows } = appConfigFor(prebuiltAppConfig, location.href);
    this.appConfig = appConfig;
    /** Stated by the page when this rung connects: where the bytes come from —
     * revised by chooseWeights() to what the ladder actually found. */
    this.weights = weights;
    this.weightsRoute = null;
    /** The default rung's declared window; contextWindowFor(id) for any rung. */
    this.contextWindow = contextWindow;
    this.contextWindows = contextWindows;
  }
  contextWindowFor(id) {
    return this.contextWindows?.[id] ?? null;
  }
  /**
   * The weights ladder, walked once per page: this site's own models/, then
   * each mirror models/MIRRORS.json names, then the publisher. A base is
   * taken when its mlc-chat-config.json for the rung answers; the choice is
   * remembered and stated. Same-origin and mirror probes are one small GET
   * each; the publisher is never probed (the library's own entry stands).
   */
  async chooseWeights(modelId) {
    if (this.weightsRoute) return this.weightsRoute;
    let mirrors = [];
    try {
      const r = await fetch(new URL("models/MIRRORS.json", location.href), { cache: "no-store" });
      if (r.ok) mirrors = readMirrors(await r.text());
    } catch { /* no MIRRORS.json — no mirrors */ }
    const tried = [];
    for (const step of weightsBases(location.href, mirrors)) {
      if (!step.base) { this.weightsRoute = { ...step, tried }; break; }
      try {
        const r = await fetch(weightsProbeUrl(step.base, modelId), { method: "GET", cache: "no-store" });
        tried.push({ base: step.base, status: r.status });
        if (r.ok) { this.weightsRoute = { ...step, tried }; break; }
      } catch (e) {
        tried.push({ base: step.base, status: null, detail: e.message });
      }
    }
    const chosen = appConfigFor(prebuiltAppConfig, location.href, undefined, { base: this.weightsRoute?.base ?? null });
    this.appConfig = chosen.appConfig;
    this.weights = this.weightsRoute?.route ?? chosen.weights;
    return this.weightsRoute;
  }

  get ready() {
    return this.engine !== null;
  }

  _terminateWorker() {
    if (this.worker) {
      try { this.worker.terminate(); } catch { /* already gone */ }
      this.worker = null;
    }
    this.engine = null;
  }

  /**
   * The engine, loading it if need be. Concurrent callers share one attempt.
   * `onProgress(text, pct)` narrates the load — the download on a first run,
   * cache reads and shader compilation after — into whatever line the caller
   * owns. Throws the typed failure text after LOAD_ATTEMPTS.
   */
  async ensure(onProgress, modelId = WEBLLM_MODEL_ID) {
    if (!isWebLLMModel(modelId)) throw new Error(`${modelId} is not an in-tab rung`);
    if (this.engine && this.modelId === modelId) return this.engine;
    if (this._loading && this._loadingId === modelId) return this._loading;
    // One engine at a time: a different rung tears the live one down (its
    // worker, its GPU buffers) before the next loads — two 1–3GB models on
    // one device is exactly the reclaimed-device failure this file guards.
    if (this.engine || this._loading) await this.unload();
    this._loadingId = modelId;
    this._loading = this._load(onProgress, modelId).finally(() => { this._loading = null; this._loadingId = null; });
    return this._loading;
  }

  async _load(onProgress, modelId) {
    await this.chooseWeights(modelId);
    onProgress?.(`weights: ${this.weights}`, 0);
    // Weight bytes about to land in this origin's storage should survive
    // cache pressure. Best-effort and remote-only: a localhost page reloads
    // them from this disk in seconds, so eviction costs nothing there.
    if (!isLocalPage(location.href)) {
      try { await navigator.storage?.persist?.(); } catch { /* advisory */ }
    }

    let lastErr = null;
    for (let attempt = 0; attempt < LOAD_ATTEMPTS; attempt++) {
      try {
        this._terminateWorker();
        this.worker = new Worker(new URL("./webllm-worker.js", import.meta.url), { type: "module" });
        // The load runs under a LIFE-based watchdog, not a total deadline: a
        // cold download is legitimately many minutes, so what is bounded is
        // silence — no progress callback for the budget means the worker is
        // gone (a device can die during load too), never that the download
        // is slow.
        let lastLife = Date.now();
        const engine = await new Promise((resolve, reject) => {
          const pulse = setInterval(() => {
            if (Date.now() - lastLife > ENGINE_FIRST_LIFE_MS) {
              clearInterval(pulse);
              reject(engineStalledError(Date.now() - lastLife, "loading the model"));
            }
          }, 5000);
          CreateWebWorkerMLCEngine(this.worker, modelId, {
            appConfig: this.appConfig,
            initProgressCallback: (report) => {
              lastLife = Date.now();
              onProgress?.(report?.text || "loading…", Math.round((report?.progress ?? 0) * 100));
            },
          }).then(
            (eng) => { clearInterval(pulse); resolve(eng); },
            (err) => { clearInterval(pulse); reject(err); },
          );
        });
        this.engine = engine;
        this.modelId = modelId;
        return engine;
      } catch (err) {
        lastErr = err;
        this._terminateWorker();
        const { kind, text } = classifyWebLLMFailure(err, { online: navigator.onLine !== false });
        // A device/GPU refusal (or a worker gone silent) will fail the same
        // way in one second; only download-shaped failures earn the
        // remaining attempts.
        if (kind === "gpu" || kind === "device-lost" || kind === "stalled") throw new Error(text);
        if (attempt < LOAD_ATTEMPTS - 1) {
          const ms = LOAD_BACKOFF_MS[attempt] ?? 4000;
          onProgress?.(`${text} — retrying in ${Math.round(ms / 1000)}s (${attempt + 2}/${LOAD_ATTEMPTS})`, 0);
          await wait(ms);
        }
      }
    }
    throw new Error(classifyWebLLMFailure(lastErr, { online: navigator.onLine !== false }).text);
  }

  /**
   * One streaming completion, in complete()'s own vocabulary: `messages` as
   * assembled, `json` as `true`/schema, `onDelta(fullTextSoFar)` returning
   * `true` to stop decoding. Returns the full text; `onUsage` receives the
   * engine's final-chunk telemetry folded to the pace ledger's shape.
   *
   * A device lost mid-stream is retried ONCE with a rebuilt engine and the
   * same request; the caller's onDelta sees the replay as a rewritten draft
   * (the accumulated text starts over), which is what actually happened.
   */
  async stream(messages, { maxTokens, json, temperature, model = WEBLLM_MODEL_ID, onDelta, onUsage, onProgress } = {}) {
    for (let round = 0; ; round++) {
      await this.ensure(onProgress, model);
      const request = toWebLLMRequest(messages, { maxTokens, json, temperature });
      let out = "";
      try {
        // Every await below runs under the watchdog: a reclaimed WebGPU
        // device leaves the worker's RPC pending forever (measured live —
        // the device-lost console line fired and the create() promise never
        // settled), so silence past the budget IS the failure, typed.
        const chunks = await withLife(this.engine.chat.completions.create(request), ENGINE_FIRST_LIFE_MS, "starting the request");
        const iter = chunks[Symbol.asyncIterator]();
        for (let first = true; ; first = false) {
          const { value: chunk, done } = await withLife(
            iter.next(),
            first ? ENGINE_FIRST_LIFE_MS : ENGINE_QUIET_MS,
            first ? "grammar compile and prefill" : "between tokens",
          );
          if (done) return out;
          if (chunk.usage) onUsage?.(paceRecordFromUsage(model, messages, chunk.usage));
          const delta = chunk.choices?.[0]?.delta?.content ?? "";
          if (!delta) continue;
          out += delta;
          if (onDelta?.(out) === true) {
            // The caller has what it needs (predictive error correction) —
            // stop the decode so no token is computed for nobody.
            try { this.engine.interruptGenerate(); } catch { /* already done */ }
            return out;
          }
        }
      } catch (err) {
        const { kind, text } = classifyWebLLMFailure(err, { online: navigator.onLine !== false });
        this._terminateWorker();
        if ((kind === "device-lost" || kind === "stalled") && round === 0) {
          onProgress?.("the GPU device was lost mid-answer — rebuilding and retrying once", 0);
          continue;
        }
        throw new Error(text);
      }
    }
  }

  async unload() {
    if (this.engine) {
      try { await this.engine.unload(); } catch { /* best effort */ }
    }
    this._terminateWorker();
    this.modelId = null;
  }
}

export const webllmClient = new WebLLMClient();
