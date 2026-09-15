// transcribe-worker.mjs — the browser's own Whisper ASR, off the main
// thread. Every OTHER wasm runtime in this app already runs as a dedicated
// module Worker (term-py-worker.mjs and its siblings, P18) for exactly this
// reason: a long-running wasm computation on the main thread freezes the
// composer for its whole duration, and Whisper inference on a real
// recording can run minutes, not milliseconds. Moving it here was found
// necessary live — a person watching a long transcription reported it
// "taking a while without any feedback" AND wanting to keep chatting
// while it ran, which the main-thread version could never honestly do.
//
// Unlike every one of those siblings, this worker does NOT sever fetch.
// Whisper's own weight download is the one disclosed non-localhost egress
// this app ever causes (WHISPER_DISCLOSURE, transcribe.js) and it needs a
// real network fetch to huggingface.co to happen at all — severing it here
// would just move the failure, not remove the crossing.

const MODEL = "onnx-community/whisper-base";
const SR = 16000;
const CHUNK_LENGTH_S = 30;
const STRIDE_LENGTH_S = 5;

let _lib = null;
let _asr = null;

/**
 * transformers.web.js has two static, top-level bare-specifier imports
 * ("onnxruntime-web/webgpu", "onnxruntime-common") that only resolve via
 * index.html's own `<script type="importmap">` — which, found live
 * (2026-09-15), does NOT scope into a module Worker; a Worker gets its own
 * separate module resolution with no import map at all, so a plain
 * `import()` of this file here throws `Failed to resolve module specifier
 * "onnxruntime-web/webgpu"`. Fetching the file's own text and rewriting
 * those two specifiers to the exact absolute paths index.html's import map
 * already names — checked, this file has no OTHER imports to break —
 * before loading it as a Blob module sidesteps needing worker-scoped
 * import map support at all.
 */
async function loadLib() {
  if (!_lib) {
    const res = await fetch("/node_modules/@huggingface/transformers/dist/transformers.web.js");
    let src = await res.text();
    // A root-relative "/node_modules/..." string does not resolve against a
    // blob: module's own base (found live: "Invalid relative url or base
    // scheme isn't hierarchical") — the rewrite needs a fully absolute URL.
    const abs = (p) => new URL(p, self.location.href).href;
    src = src
      .replace('from "onnxruntime-web/webgpu"', `from "${abs("/node_modules/onnxruntime-web/dist/ort.webgpu.bundle.min.mjs")}"`)
      .replace('from "onnxruntime-common"', `from "${abs("/node_modules/onnxruntime-common/dist/esm/index.js")}"`);
    const blobUrl = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    try {
      _lib = await import(/* webpackIgnore: true */ blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }
  return _lib;
}

/**
 * The library reports EACH weight file's own download as an independent
 * 0→100% sweep (config.json, tokenizer files, the encoder, the decoder —
 * onnx-community/whisper-base ships several), so a bare pass-through of
 * `p.progress` visibly resets and jumps between files — measured live,
 * reported as "wacky numbers ... I think it was downloading weights".
 * Aggregating loaded/total bytes across every file seen so far turns that
 * into one real, close-to-monotonic percentage of the whole download.
 */
async function loadASR(post) {
  if (_asr) return _asr;
  const { pipeline } = await loadLib();
  const files = new Map();
  const progress_callback = (p) => {
    if (!p || p.status !== "progress" || p.loaded == null) return;
    files.set(p.file ?? "weights", { loaded: p.loaded, total: p.total || p.loaded });
    let loaded = 0, total = 0;
    for (const f of files.values()) { loaded += f.loaded; total += f.total; }
    if (total > 0) post({ type: "progress", stage: "download", pct: Math.max(0, Math.min(1, loaded / total)) });
  };
  _asr = await pipeline("automatic-speech-recognition", MODEL, {
    device: "wasm",
    dtype: "fp32",
    progress_callback,
  }).catch((e) => { _asr = null; throw e; });
  return _asr;
}

/**
 * The exact window/stride walk `_call_whisper` runs internally
 * (chunk_length_s / stride_length_s), replicated here only to COUNT how
 * many windows the real call will process — never to slice the audio
 * ourselves (transcribe.js's own docstring: isolated slices lose
 * inter-chunk context and hallucinate). This is read-only bookkeeping so
 * `on_finalize` (below) can turn "one more window finished" into a real
 * fraction of the whole file, not a guess — and, the same arithmetic,
 * exactly where a caller could safely resume if this run dies partway
 * (JUMP, below): `_call_whisper`'s own loop starts every window it
 * processes at a multiple of `jump` from wherever ITS OWN input array
 * begins, so handing it `mono.subarray(N * jump)` after N windows have
 * finished reproduces windows N, N+1, ... byte-for-byte — never a
 * mid-window slice, which is the case the "isolated slices hallucinate"
 * warning is actually about.
 */
const WINDOW = SR * CHUNK_LENGTH_S;
const STRIDE = SR * STRIDE_LENGTH_S;
const JUMP = WINDOW - 2 * STRIDE;

function totalWindows(sampleCount) {
  if (sampleCount <= WINDOW) return 1;
  let n = 1, offsetEnd = WINDOW;
  while (offsetEnd < sampleCount) { offsetEnd += JUMP; n += 1; }
  return n;
}

self.onmessage = async (ev) => {
  const m = ev.data ?? {};
  const post = (msg) => self.postMessage(msg);

  if (m.type === "load") {
    try {
      await loadASR(post);
      post({ type: "ready" });
    } catch (e) {
      post({ type: "error", message: e?.message ?? String(e) });
    }
    return;
  }

  if (m.type === "transcribe") {
    try {
      const asr = await loadASR(post);
      const mono = new Float32Array(m.mono);
      const total = totalWindows(mono.length);
      let doneWindows = 0;
      let live = "";
      const { WhisperTextStreamer } = await loadLib();
      // One streamer instance spans every window: `generate()` calls
      // `.put()` as tokens decode and `.end()` when that window's own
      // generation finishes (verified against the vendored library's real
      // generate() implementation, not assumed) — so `callback_function`
      // gives real growing text DURING inference, and `on_finalize` gives
      // one honest tick per completed window, not per token.
      const streamer = new WhisperTextStreamer(asr.tokenizer, {
        callback_function: (piece) => { live += piece; post({ type: "chunk", text: live }); },
        // `resumeSamples` shifts this run's own offsets back into the
        // ORIGINAL file's coordinates when this call is itself a resumed
        // continuation (transcribe.js already sliced the audio before
        // sending it here) — so a SECOND failure resumes from the true
        // absolute point, not from zero within just the remainder.
        on_finalize: () => {
          doneWindows += 1;
          post({
            type: "progress",
            stage: "transcribe",
            pct: Math.min(1, doneWindows / total),
            resumeSamples: (m.resumeSamples ?? 0) + doneWindows * JUMP,
          });
        },
      });
      const out = await asr(mono, {
        chunk_length_s: CHUNK_LENGTH_S,
        stride_length_s: STRIDE_LENGTH_S,
        // TIMESTAMPS ARE THE ADDRESS (P138) — unchanged from the main-thread
        // version this replaces.
        return_timestamps: true,
        language: m.lang === "es" ? "spanish" : "english",
        streamer,
      });
      const text = String((out && out.text) || "").trim();
      const segments = Array.isArray(out?.chunks)
        ? out.chunks.map((c) => ({ text: String(c?.text ?? "").trim(), timestamp: c?.timestamp ?? [] })).filter((c) => c.text)
        : [];
      post({ type: "done", text, segments });
    } catch (e) {
      post({ type: "error", message: e?.message ?? String(e) });
    }
    return;
  }
};
