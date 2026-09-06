import test from "node:test";
import assert from "node:assert/strict";
import { passagesFromSegments, audioRef, parseAudioRef, isAudioRef, citeAudio, clock } from "./audio-address.js";

const segs = [
  { text: "Well, Prince, so Genoa and Lucca", timestamp: [0, 2.4] },
  { text: "are now just family estates of the Buonapartes.", timestamp: [2.4, 5.1] },
  { text: "But I warn you,", timestamp: [12.0, 13.2] },
  { text: "if you do not tell me we are at war,", timestamp: [13.2, 15.9] },
];

test("a transcript is addressed by TIME, and a pause is the speaker's own boundary", () => {
  const ps = passagesFromSegments("anna.mp3", segs);
  assert.equal(ps.length, 2, "the seven-second silence ended the first passage");
  assert.equal(ps[0].ref, "anna.mp3@0.0-5.1");
  assert.equal(ps[1].ref, "anna.mp3@12.0-15.9");
  assert.match(ps[0].text, /^Well, Prince, so Genoa and Lucca are now just family estates/);
  assert.equal(ps[0].kind, "audio", "so the ladder can say what kind of standing it has");
  assert.equal(ps[0].source, "anna.mp3");
});

test("a time address is not a byte range and can never be read as one", () => {
  assert.equal(audioRef("a.mp3", 12, 15.94), "a.mp3@12.0-15.9");
  assert.deepEqual(parseAudioRef("a.mp3@12.0-15.9"), { name: "a.mp3", from: 12, to: 15.9 });
  assert.equal(parseAudioRef("book.txt#100-200"), null, "a byte range is not an audio address");
  assert.ok(isAudioRef("a.mp3@0.0-5.1") && !isAudioRef("book.txt#0-5"));
  assert.equal(citeAudio("a.mp3@72.0-95.5"), "a.mp3 at 1:12–1:35", "a person reads a moment, not a number");
  assert.equal(clock(95), "1:35");
});

test("a recognizer that returns no timings yields no addressed passages — not fabricated ones", () => {
  assert.deepEqual(passagesFromSegments("a.mp3", []), []);
  assert.deepEqual(passagesFromSegments("a.mp3", [{ text: "hello", timestamp: [] }]), []);
  // Long speech with no pause is still cut, so a passage stays retrievable.
  const long = Array.from({ length: 40 }, (_, i) => ({ text: `sentence number ${i} of the talk`, timestamp: [i, i + 0.9] }));
  const ps = passagesFromSegments("talk.mp3", long);
  assert.ok(ps.length > 1 && ps.every((p) => p.text.length < 1400));
  assert.ok(ps.every((p) => isAudioRef(p.ref)));
});
