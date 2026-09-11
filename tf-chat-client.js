// tf-chat-client.js — the on-device CPU rungs' runtime. The decisions live in
// tf-rung.js (pure); this file is only the machinery those decisions drive:
// the transformers.js pipeline on the MAIN THREAD.
//
// WHY THE MAIN THREAD AND NOT A WORKER: transformers.web.js imports
// `onnxruntime-web/webgpu` and `onnxruntime-common` as BARE specifiers, and
// those resolve through index.html's import map — which applies to the page
// (and to dynamic imports from it, which is how transcribe.js runs Whisper)
// but NOT to a module Worker (measured 2026-09-11: the worker module fails
// to load with a bare, detail-less error exactly on those imports). So the
// proven path is transcribe.js's own: a dynamic import from the page, the
// import map resolving the onnxruntime bundle, the model fetched from its
// publisher. A generation occupies the main thread for a few seconds on a
// phone — the price of a working fallback rung, and the page is otherwise
// idle while the fold's own notes do the thinking.
//
// `preload()` is what makes the download EXPLICIT: the page starts it the
// moment the rung is connected, so the weight fetch happens with a banner on
// screen, not buried inside the first turn.
//
// BRAVE, MEASURED (2026-09-11): a long model download drops on Brave when
// its Shields are active — in a headless run the fetch stalled at ~48s on
// every attempt until Shields was disabled, then the whole ~790 MB completed
// in 84s. The retry below exists because of it: a dropped download (mobile
// networks, Brave's blocker, a blip) is retried, bounded, instead of failing
// the rung. transformers.js cannot resume a partial file, so the retry
// restarts from what the browser cache holds — the honest cost of the
// browser Cache API keeping only complete responses.

import { TF_MODEL_ID, isTfModel } from "./tf-rung.js";

/** How long the pipeline may go SILENT before it is called dead. A real
 *  download streams progress regularly and KICKS the watchdog; the ONNX
 *  compile after the download and a CPU generation are silent but bounded by
 *  the same clock — so this is generous, and only a genuinely stuck pipeline
 *  (a dead module, a hung fetch, a wedged session) ever trips it. Surfaced,
 *  never a banner that sits at 0% forever ("not downloading", 2026-09-11). */
const SILENCE_MS = 300_000;

/** Download retries on a DROPPED fetch, and the waits between them. A long
 *  model download drops on real mobile networks — and, measured live in a
 *  Brave headless run, Brave's own Shields drops it too (the download
 *  stalled at ~48s repeatedly until Shields was disabled). transformers.js
 *  cannot resume a partial file (the browser Cache API keeps only complete
 *  responses), so a retry restarts from what the cache holds — better than
 *  failing the whole rung, and the watchdogs keep the attempts bounded. */
const LOAD_ATTEMPTS = 3;
const LOAD_BACKOFF_MS = [1500, 5000];

/** A watchdog that is KICKED by any sign of life: `keepAlive` hands the
 *  caller a `kick()` (wire it into a progress callback), and the promise
 *  rejects only if `ms` passes with no kick. A slow-but-moving download is
 *  never cut off — only a genuinely silent pipeline is. */
function withLife(promise, ms, what, keepAlive) {
  let timer = null;
  let armed = false;
  const deadline = new Promise((_, reject) => {
    const arm = () => {
      armed = true;
      clearTimeout(timer);
      timer = setTimeout(() => reject(new Error(`${what} — no answer for ${Math.round(ms / 1000)}s; check that this page can reach huggingface.co`)), ms);
    };
    arm();
    keepAlive?.(arm);
  });
  return Promise.race([promise, deadline]).finally(() => { armed = false; clearTimeout(timer); timer = null; });
}

/** The assistant's words out of transformers.js's chat output shape:
 *  `[{ generated_text: [{role, content}, …] }]` for chat input, or a plain
 *  string for text input. The fold always sends `messages` (chat), so the
 *  assistant message is the last entry. */
function textOf(out) {
  if (!Array.isArray(out) || !out.length) return "";
  const g = out[0]?.generated_text;
  if (typeof g === "string") return g;
  if (Array.isArray(g)) {
    const last = g.at(-1);
    return typeof last?.content === "string" ? last.content : "";
  }
  return "";
}

class TfChatClient {
  constructor() {
    this.pipe = null;
    this.model = null; // the model the loaded pipe holds
    this._loading = null; // in-flight pipeline load, shared by concurrent callers
    this._loadingModel = null;
    this._preload = null; // in-flight preload(), shared
    this._genChain = Promise.resolve(); // ONE generation at a time (a CPU pipeline is not reentrant)
  }

  get ready() {
    return this.pipe !== null;
  }

  /** The pipeline for ONE model, loading it if need be. A DIFFERENT rung
   *  discards the loaded pipeline and loads the new one (two ~1 GB models on
   *  one phone is a memory failure) — model switching is a real reload, not
   *  silently answering with the previous model. `kick` (when provided) is
   *  called on every progress tick so the download keeps its watchdog alive. */
  _pipeline(model, onProgress, kick) {
    if (this.pipe && this.model === model) return Promise.resolve(this.pipe);
    if (this._loading && this._loadingModel === model) return this._loading;
    if (this._loading) this._loading = null; // a different model is in flight — start fresh
    this.pipe = null;
    this._loadingModel = model;
    let lastPct = null;
    this._loading = (async () => {
      const { pipeline, env } = await import("/node_modules/@huggingface/transformers/dist/transformers.web.js");
      // The model is fetched from its publisher (Hugging Face) — explicitly
      // remote, so the fetch can never be diverted to a local path, and
      // single-threaded WASM (a phone page has no cross-origin isolation, so
      // SharedArrayBuffer is not available to thread the wasm).
      env.allowRemoteModels = true;
      env.allowLocalModels = false;
      try { env.backends.onnx.wasm.numThreads = 1; } catch { /* older build */ }
      let lastErr = null;
      for (let attempt = 0; attempt < LOAD_ATTEMPTS; attempt++) {
        try {
          const pipe = await pipeline("text-generation", model, {
            device: "wasm",
            dtype: "q4",
            progress_callback: (p) => {
              if (p && p.status === "progress" && p.progress != null) {
                kick?.();
                // Throttled: the library reports every fraction of a percent;
                // the banner needs whole percent steps, not a DOM update per tick.
                const whole = Math.floor(p.progress);
                if (whole !== lastPct) { lastPct = whole; onProgress?.(p.file ?? "weights", whole); }
              }
            },
          });
          this.pipe = pipe;
          this.model = model;
          return pipe;
        } catch (e) {
          lastErr = e;
          // A dropped download — mobile networks, Brave's Shields (measured
          // 2026-09-11), a blip — is RETRIED, bounded. transformers.js cannot
          // resume a partial file, so the retry restarts from the browser
          // cache; still better than failing the whole rung, and the
          // watchdogs hold the line on total time.
          if (attempt < LOAD_ATTEMPTS - 1 && /network|fetch|failed|abort|timeout|ECONN|ERR_/i.test(String(e?.message ?? e))) {
            onProgress?.("connection dropped — retrying…", lastPct ?? 0);
            await new Promise((r) => setTimeout(r, LOAD_BACKOFF_MS[attempt] ?? 2000));
            continue;
          }
          throw lastErr;
        }
      }
      throw lastErr;
    })().catch((e) => { this._loading = null; this._loadingModel = null; throw e; });
    return this._loading;
  }

  /**
   * Load the model now (not on the first generation): `onProgress(text, pct)`
   * narrates the weight download into the page's banner, and the promise
   * resolves once the model is ready. The conversation never waits for this
   * unless the first turn is already in flight.
   */
  preload({ model = TF_MODEL_ID, onProgress } = {}) {
    if (!isTfModel(model)) throw new Error(`${model} is not an on-device CPU rung`);
    if (this._preload) return this._preload;
    let kick = null;
    this._preload = withLife(this._pipeline(model, onProgress, () => kick?.()), SILENCE_MS, "the model download", (arm) => { kick = arm; })
      .finally(() => { this._preload = null; });
    return this._preload;
  }

  /**
   * One generation, in complete()'s vocabulary: `messages` as assembled,
   * `json` best-effort (no constrained decoding — the instruction is the
   * ask and the caller's parser is the wall), `onProgress` narrating a
   * not-yet-loaded model. Generations are serialized: a CPU pipeline is not
   * reentrant, so a summary refresh never collides with the answer.
   * Returns `{text, usage}` — usage is null (the ONNX runtime reports no
   * token counts through this path), which foldPace treats as "no measurement".
   */
  async complete(messages, { maxTokens, temperature, json, model = TF_MODEL_ID, onProgress } = {}) {
    if (!isTfModel(model)) throw new Error(`${model} is not an on-device CPU rung`);
    let kick = null;
    // The whole job — model load if needed (its progress kicks the watchdog),
    // then the generation — runs under ONE watcher, so a first turn that
    // arrives before preload() finished is watched and kicked too.
    const job = this._genChain.then(async () => {
      const pipe = await this._pipeline(model, onProgress, () => kick?.());
      const wantJson = !!json;
      const msgs = wantJson && messages?.length
        ? [...messages, { role: "user", content: "Reply with a single valid JSON object only, no prose." }]
        : messages;
      const out = await pipe(msgs, {
        max_new_tokens: Number.isFinite(maxTokens) ? maxTokens : 256,
        do_sample: typeof temperature === "number" && temperature > 0,
        temperature: typeof temperature === "number" ? temperature : 1,
        return_full_text: false,
      });
      return { text: textOf(out), usage: null };
    });
    this._genChain = job.catch(() => {}); // a failed generation must not wedge the chain
    return withLife(job, SILENCE_MS, "the on-device generation", (arm) => { kick = arm; });
  }

  unload() {
    this.pipe = null;
    this.model = null;
    this._loading = null;
    this._loadingModel = null;
  }
}

export const tfChatClient = new TfChatClient();