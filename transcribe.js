// transcribe.js — Whisper-based transcription for The Fold.
// Runs entirely in the browser: the model downloads once and stays local.
// Handles both uploaded audio files and YouTube audio (fetched server-side
// via serve.mjs's /api/transcribe endpoint, since the browser cannot reach
// YouTube directly under the local-only policy).
//
// Derived from ab/vendor/voice.js (the earlier in-browser Whisper ASR),
// restructured as an ES module for The Fold's module layout.

const SR = 16000;
const MODEL = "onnx-community/whisper-base";
/** Said out loud on the first transcription: the one non-localhost fetch
 * this page ever causes, and only on this act — never on page load. */
export const WHISPER_DISCLOSURE = `(first use fetches the ${MODEL} weights from huggingface.co, ~150 MB, cached by this browser; the audio itself never leaves this machine)`;

let _asr = null;

async function loadASR(onProgress) {
  if (!_asr) {
    _asr = (async () => {
      let device = "wasm";
      try {
        if (navigator.gpu && (await navigator.gpu.requestAdapter())) device = "webgpu";
      } catch {}

      const { pipeline } = await import(
        "/node_modules/@huggingface/transformers/dist/transformers.web.js"
      );

      const progress_callback = (p) => {
        if (typeof onProgress === "function" && p && p.status === "progress" && p.progress != null)
          onProgress(Math.max(0, Math.min(1, p.progress / 100)));
      };

      const dtype = device === "webgpu" ? "fp16" : "q8";
      try {
        return await pipeline("automatic-speech-recognition", MODEL, {
          device,
          dtype,
          progress_callback,
        });
      } catch {
        return await pipeline("automatic-speech-recognition", MODEL, {
          device,
          progress_callback,
        });
      }
    })().catch((e) => {
      _asr = null;
      throw e;
    });
  }
  return _asr;
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
 * Returns { text, duration }.
 *
 * Derived from ab/vendor/voice.js: the entire decoded mono is passed to
 * asr() in one call. Whisper's own chunk_length_s / stride_length_s
 * parameters handle internal chunking — the caller must NOT manually
 * slice the audio, as isolated slices lose inter-chunk context and
 * produce hallucinated repetitive output.
 *
 * When `onChunk` is provided, the pipeline still runs as a single asr()
 * call (for accuracy), but fires onChunk with intermediate status updates
 * so the UI can show progress.
 */
export async function transcribeBlob(blob, { onProgress, onChunk, lang = "en" } = {}) {
  const mono = await decodeMono(blob);
  if (!mono.length) return { text: "", duration: 0 };

  const asr = await loadASR(onProgress);
  const duration = mono.length / SR;

  if (onChunk) onChunk("transcribing…");

  const out = await asr(mono, {
    chunk_length_s: 30,
    stride_length_s: 5,
    // TIMESTAMPS ARE THE ADDRESS (P138). Without them a transcript is one
    // flat blob whose only address is "somewhere in this file", and every
    // organ downstream is blind to it in the way that matters: a snip needs
    // a span, an atom needs company at an address, the ladder needs somewhere
    // to point, the export needs bytes to quote, and a person needs to be
    // able to go and HEAR the moment being cited.
    return_timestamps: true,
    language: lang === "es" ? "spanish" : "english",
  });

  const text = String((out && out.text) || "").trim();
  // The recognizer's own cut, kept. A model that returns no chunks still
  // returns text, and the caller falls back to an unaddressed transcript with
  // that fact visible rather than silently.
  const segments = Array.isArray(out?.chunks)
    ? out.chunks.map((c) => ({ text: String(c?.text ?? "").trim(), timestamp: c?.timestamp ?? [] })).filter((c) => c.text)
    : [];
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
