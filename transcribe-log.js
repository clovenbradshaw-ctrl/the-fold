// transcribe-log.js — append-only log for transcription pipeline layers.
// Each transcription run produces up to three entries:
//   1. raw      — the Whisper model's own output
//   2. self     — coreference resolution on the raw text (pronouns → referents)
//   3. priors   — coreference with priors corpus context
//
// Pure — all I/O goes through the explore-server.mjs route. Two-base
// fallback pattern, same as record()/priors()/pip() in term.js.

const BASES = ["", "http://localhost:8812"];

async function post(entry) {
  for (const base of BASES) {
    try {
      const r = await fetch(`${base}/api/transcribe-log`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(entry),
      });
      if (r.ok) return true;
    } catch { /* try next base */ }
  }
  return false;
}

/**
 * Append one layer of a transcription run to the log.
 * @param {"raw"|"self"|"priors"} layer
 * @param {string} text — the transcribed/resolved text for this layer
 * @param {object} [meta] — optional metadata (duration, source, etc.)
 */
export async function logTranscriptionLayer(layer, text, meta = {}) {
  return post({ layer, text, meta });
}
