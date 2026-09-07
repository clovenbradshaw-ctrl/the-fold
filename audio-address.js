// audio-address.js — a transcript that can be cited (P138). Pure.
//
// Transcription already worked; what it produced could not be checked. It
// landed as one flat blob under a `transcription-<epoch>.txt` name, so every
// organ downstream was blind to it in the way that matters: a snip needs a
// span, an atom needs company at an address, the ground ladder needs
// somewhere to point, the export needs bytes to quote, and a person needs to
// be able to go and HEAR the moment being cited. None of that works on a
// blob whose only address is "somewhere in this file".
//
// So a transcript is cut at the boundaries the recognizer itself gives —
// timestamped segments — and each passage carries a TIME address:
//
//   text     name#<byteStart>-<byteEnd>      bytes into a file
//   audio    name@<seconds>-<seconds>        seconds into a recording
//
// The `@` is deliberate: it is not a byte range and must never be read as
// one, and every reader can tell the two apart at a glance. Everything else
// in the instrument works unchanged, because everything else only ever needed
// `{ ref, text }` — which is the point of an address.
//
// WHAT AN AUDIO ADDRESS IS AN ADDRESS *OF*. The recording, not the world. A
// transcript is testimony about what was SAID; the recognizer is a reader
// with a known error rate, so a citation of it is a citation of speech that
// was heard, never of a fact. `kind: "audio"` travels with the passage so the
// ladder can say so.

/** Seconds → m:ss, for a person reading a citation. */
export const clock = (s) => {
  const t = Math.max(0, Math.floor(Number(s) || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/** The address of a stretch of a recording. Seconds, one decimal — finer than a listener can seek. */
export const audioRef = (name, from, to) => `${name}@${Number(from).toFixed(1)}-${Number(to).toFixed(1)}`;

/** Read an audio address back, or null if it is not one. */
export function parseAudioRef(ref) {
  const m = String(ref ?? "").match(/^(.+)@(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  return m ? { name: m[1], from: Number(m[2]), to: Number(m[3]) } : null;
}
export const isAudioRef = (ref) => parseAudioRef(ref) != null;

/**
 * passagesFromSegments(name, segments, { target, maxGap }) → addressed passages
 *
 * Segments are the recognizer's own cut (`{ text, timestamp: [from, to] }`).
 * They are far too small to retrieve against one by one — Whisper emits a
 * phrase at a time — so they are gathered up to about `target` characters,
 * and a silence longer than `maxGap` ends a passage wherever it falls, since
 * a pause is the speaker's own boundary and a better one than any count.
 */
export function passagesFromSegments(name, segments = [], { target = 900, maxGap = 2.5 } = {}) {
  const out = [];
  let buf = [];
  let from = null;
  let last = null;
  const flush = () => {
    if (!buf.length) return;
    const text = buf.join(" ").replace(/\s+/g, " ").trim();
    if (text) out.push({ ref: audioRef(name, from, last), source: name, kind: "audio", from, to: last, text });
    buf = []; from = null;
  };
  for (const seg of segments) {
    const t = String(seg?.text ?? "").trim();
    const ts = seg?.timestamp ?? seg?.timestamps ?? [];
    const a = Number(ts[0]); const b = Number(ts[1] ?? ts[0]);
    if (!t || !Number.isFinite(a)) continue;
    if (from != null && (a - last > maxGap || buf.join(" ").length >= target)) flush();
    if (from == null) from = a;
    buf.push(t);
    last = Number.isFinite(b) ? b : a;
  }
  flush();
  return out;
}

/** How a citation of a recording reads to a person: the name and the moment, never a byte range. */
export function citeAudio(ref) {
  const p = parseAudioRef(ref);
  return p ? `${p.name} at ${clock(p.from)}–${clock(p.to)}` : String(ref ?? "");
}

/**
 * A transcript is testimony about speech, not about the world — said once,
 * where the ladder and the export can both reach it.
 */
export const AUDIO_STANDING = "heard in the recording at this moment; a transcript is what a recognizer made of speech, not a fact about the world";
