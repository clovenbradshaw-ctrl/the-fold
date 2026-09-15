// transcribe.js — Whisper-based transcription for The Fold.
// Runs entirely in the browser: the model downloads once and stays local.
// Handles both uploaded audio files and YouTube audio (fetched server-side
// via serve.mjs's /api/transcribe endpoint, since the browser cannot reach
// YouTube directly under the local-only policy).
//
// Derived from ab/vendor/voice.js (the earlier in-browser Whisper ASR),
// restructured as an ES module for The Fold's module layout.
//
// The actual ASR now runs in transcribe-worker.mjs, not on this thread —
// this file is the main-thread half: audio decoding (needs a real
// AudioContext, which a Worker cannot have) and the worker's postMessage
// protocol. See that file's own header for why (a long transcription must
// not freeze the composer, measured live, 2026-09-15).

const SR = 16000;
const MODEL = "onnx-community/whisper-base";
/** Said out loud on the first transcription: the one non-localhost fetch
 * this page ever causes, and only on this act — never on page load. */
export const WHISPER_DISCLOSURE = `(first use fetches the ${MODEL} weights from huggingface.co, ~150 MB, cached by this browser; the audio itself never leaves this machine)`;

/**
 * Deliberately `device: "wasm", dtype: "fp32"` inside the worker — measured
 * live (2026-09-09), not the library's per-hardware default. Whichever
 * quantized or GPU-routed load this app tried before either loaded fine and
 * transcribed WRONG, or failed to load at all:
 *
 *   - webgpu + fp16 (what this file used to request when a GPU was
 *     present): loads without error, but on a clean 5.6s test clip
 *     ("This is a test of the fold transcription pipeline. The quick
 *     brown fox jumps over the lazy dog.", real speech, confirmed correct
 *     by a second, independent model) it returned the single word "I'm" —
 *     silently wrong, nothing here would have caught it.
 *   - wasm + q8 (this file's old fallback for no-GPU): onnxruntime-web
 *     refuses to create a session at all — "Missing required scale:
 *     model.decoder.embed_tokens.weight_merged_0_scale" — so the OLD
 *     try/catch below silently re-tried with no dtype specified at all,
 *     which is not full precision either (see next point) and was never
 *     actually exercised in this measurement because...
 *   - device left unset, or device: "webgpu" with dtype: "fp32": BOTH hit
 *     the identical missing-scale error above, on this exact
 *     onnxruntime-web build. This is eopm's own sibling implementation's
 *     already-diagnosed bug (`eopm/src/transcribe-worker.js`, citing
 *     `ab/vendor/voice.js`'s fix commit e1b89d5) — onnx-community/
 *     whisper-base's own default/webgpu dtype resolution picks a
 *     mixed-precision decoder file whose embed_tokens weight is quantized
 *     without the scale tensor DequantizeLinear needs. eopm's own fix
 *     (`dtype: 'fp32'`, device left unset) does not fully generalize here
 *     — this app's browser has WebGPU, and requesting fp32 without pinning
 *     wasm still resolves onto the broken webgpu path.
 *
 * The one combination that has actually been run against real speech and
 * produced the correct words, with correct segment timestamps, is wasm +
 * fp32 — slower than GPU inference would be, but a transcription feature
 * whose whole value is the addressable words it produces cannot trade
 * correctness for speed. No try/catch fallback: every other path measured
 * here is either wrong or refuses to load, so there is nothing worth
 * falling back TO. (The pin itself now lives in transcribe-worker.mjs.)
 */
let _worker = null;
function worker() {
  if (!_worker) _worker = new Worker(new URL("./transcribe-worker.mjs", import.meta.url), { type: "module" });
  return _worker;
}

/** One request/response round trip against the worker, relaying its
 * `progress`/`chunk` events to the caller as they arrive and resolving on
 * `ready` or `done`. Scoped to its own listener so two calls in flight
 * (load, then transcribe) never see each other's messages.
 *
 * Also listens for the worker's own `error` event — a genuine crash
 * (out-of-memory on a very large file, for instance; reported live,
 * 2026-09-15) terminates the worker WITHOUT ever posting a `type: "error"`
 * message, so without this the caller's promise would simply hang forever
 * with the UI frozen on "transcribing…" and no way to tell a crash from
 * slow progress. A dead worker is discarded so the next call starts a
 * fresh one rather than posting into a corpse.
 */
function callWorker(msg, { onProgress, onChunk, transfer } = {}) {
  return new Promise((resolve, reject) => {
    const w = worker();
    const cleanup = () => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
    };
    const onMessage = (ev) => {
      const m = ev.data ?? {};
      if (m.type === "progress") { onProgress?.(m); return; }
      if (m.type === "chunk") { onChunk?.(m.text); return; }
      if (m.type === "ready" || m.type === "done") { cleanup(); resolve(m); return; }
      if (m.type === "error") { cleanup(); reject(new Error(m.message)); return; }
    };
    const onError = (ev) => {
      cleanup();
      if (_worker === w) { _worker = null; _loaded = false; }
      try { w.terminate(); } catch {}
      reject(new Error(`the transcription worker crashed${ev?.message ? `: ${ev.message}` : " (likely out of memory — try a shorter clip)"}`));
    };
    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    w.postMessage(msg, transfer ?? []);
  });
}

let _loaded = false;
async function loadASR(onProgress) {
  if (_loaded) return;
  await callWorker({ type: "load" }, { onProgress });
  _loaded = true;
}

async function decodeMono(blob) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error("this browser cannot decode audio");
  const bytes = await blob.arrayBuffer();
  const tmp = new AC();
  let decoded;
  try {
    decoded = await tmp.decodeAudioData(bytes.slice(0));
  } finally {
    try {
      tmp.close();
    } catch {}
  }
  const off = new OfflineAudioContext(
    1,
    Math.max(1, Math.ceil(decoded.duration * SR)),
    SR,
  );
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  return (await off.startRendering()).getChannelData(0);
}

/**
 * Pre-warm the Whisper model download. Safe to call on page load —
 * never rejects (a failed pre-warm retries on the real call).
 */
export function autoDownload(onProgress) {
  return loadASR(onProgress).catch(() => {});
}

/**
 * Transcribe an audio Blob (mp3, wav, webm, etc.) to text.
 * Returns { text, duration, segments, addressed }.
 *
 * Derived from ab/vendor/voice.js: the entire decoded mono is handed to the
 * worker's asr() in one call. Whisper's own chunk_length_s / stride_length_s
 * parameters handle internal chunking — the caller must NOT manually
 * slice the audio, as isolated slices lose inter-chunk context and
 * produce hallucinated repetitive output.
 *
 * `onProgress` fires with `{ stage: "download" | "transcribe", pct,
 * resumeSamples? }` — two genuinely different things (a one-time model
 * fetch vs. this file's own inference), never collapsed into one number
 * again (that collapse is what "wacky numbers ... downloading weights"
 * reported, 2026-09-15). During the transcribe stage, `resumeSamples` is
 * the exact sample offset (in the ORIGINAL, full-length audio) of the
 * last window this run finished — the caller's own resume point if this
 * call later throws (RESUME, below). `onChunk` fires with the GROWING
 * transcript text as the worker's own WhisperTextStreamer decodes it —
 * real streamed text, not a static placeholder string.
 *
 * RESUME (`resumeFromSamples`, `priorText`): a long transcription that
 * dies partway (an OOM crash on a large file, reported live 2026-09-15)
 * used to lose everything and force a full restart. `resumeFromSamples`
 * slices the decoded audio to start exactly at a completed-window
 * boundary before it ever reaches the worker — never mid-window, which is
 * the one case actually unsafe to resume at (this file's own long-standing
 * warning: an isolated slice loses inter-chunk context and hallucinates).
 * Starting a fresh run at a clean boundary is not an isolated slice in
 * that sense — Whisper's own chunking always starts from sample 0 of
 * whatever it is given, so handing it the remainder reproduces the exact
 * windows an uninterrupted run would have produced from there. `priorText`
 * is prepended to the result so the caller gets one continuous transcript
 * back, not two fragments to stitch together.
 */
export async function transcribeBlob(blob, { onProgress, onChunk, lang = "en", resumeFromSamples = 0, priorText = "" } = {}) {
  const fullMono = await decodeMono(blob);
  if (!fullMono.length) return { text: "", duration: 0 };
  const duration = fullMono.length / SR;
  const mono = resumeFromSamples > 0 ? fullMono.subarray(resumeFromSamples) : fullMono;
  if (!mono.length) return { text: priorText, duration, segments: [], addressed: false };

  await loadASR(onProgress);

  if (onChunk) onChunk(priorText);

  // mono.buffer is transferred (not copied) into the worker. When resuming,
  // mono is already a SUBARRAY view over fullMono's buffer — transferring a
  // view's buffer would transfer the WHOLE underlying buffer (fine; the
  // worker only reads it as m.mono, a plain ArrayBuffer, and re-slices via
  // Float32Array's own byteOffset/length if we passed those — simplest is
  // to just copy the subarray's own bytes so the transfer list only ever
  // detaches exactly what this call owns).
  const payload = resumeFromSamples > 0 ? mono.slice() : mono;
  const result = await callWorker(
    { type: "transcribe", mono: payload.buffer, lang, resumeSamples: resumeFromSamples },
    {
      onProgress,
      onChunk: onChunk ? (partial) => onChunk(priorText ? `${priorText} ${partial}`.trim() : partial) : undefined,
      transfer: [payload.buffer],
    },
  );

  const text = (priorText ? `${priorText} ${String(result.text || "").trim()}`.trim() : String(result.text || "").trim());
  // The recognizer's own cut, kept. A model that returns no chunks still
  // returns text, and the caller falls back to an unaddressed transcript with
  // that fact visible rather than silently.
  const segments = Array.isArray(result.segments) ? result.segments : [];
  if (onChunk) onChunk(text);
  return { text, duration, segments, addressed: segments.length > 0 };
}

/**
 * Fetch audio from a URL via the server's /api/transcribe endpoint.
 * For YouTube URLs, the server uses yt-dlp to extract the audio.
 * Returns a Blob of the audio data.
 */
export async function fetchAudioFromUrl(url) {
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "failed to fetch audio");
  }
  const data = await res.json();
  // The server returns base64-encoded audio and metadata.
  const bytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
  return { blob: new Blob([bytes], { type: data.mime || "audio/mpeg" }), title: data.title || url };
}
