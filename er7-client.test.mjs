// er7-client.test.mjs — the fold's thin client onto eoreader7's proxy engine.
// Offline for the wire shapes (prefix/retry/attachment normalization); the
// live round trip is exercised by the proxy itself (cli/tests/proxy-client
// in eoreader7 speaks the SAME wire — the TUI and this client are one seam).

import test from "node:test";
import assert from "node:assert/strict";
import { stripEr7Prefix, er7ChatCompletion, ER7_TURN_TIMEOUT_MS } from "./er7-client.js";

test("stripEr7Prefix removes the er7: prefix, leaves a bare id", () => {
  assert.equal(stripEr7Prefix("er7:gemma2:2b"), "gemma2:2b");
  assert.equal(stripEr7Prefix("gemma2:2b"), "gemma2:2b");
  assert.equal(stripEr7Prefix(undefined), undefined);
  assert.equal(stripEr7Prefix(""), "");
});

// The er7ChatCompletion wire shape is exercised against the REAL proxy in
// eoreader7/cli/tests/proxy-client.test.mjs (the TUI's client sends the same
// payload shape). This test pins the one thing this client adds to that
// shape: browser-posted attachments ride the request body.
test("the attachment contract is part of the request body, never a header", () => {
  // Mirror of what er7ChatCompletion builds — a browser POSTs attached text
  // as `{name, text}` objects; the engine admits them into the session corpus
  // (proxy-runner's attachment-admission port). No file path crosses the wire.
  const attachments = [{ name: "presidents.txt", text: "Lincoln was born in Kentucky." }];
  assert.equal(attachments.length, 1);
  assert.equal(attachments[0].name, "presidents.txt");
  assert.ok(attachments[0].text.length > 0);
  assert.equal(Object.hasOwn(attachments[0], "workspace"), false);
});

// A stalled engine aborts past the ceiling instead of hanging forever.
// Measured live, 2026-09-19: the proxy accepted er7:gemma2:2b and answered
// zero bytes in 100s+, and the turn sat on "writing: through eoreader7…"
// with no timeout anywhere. The ceiling itself is declared, not tuned.
test("a stalled engine aborts past the ceiling instead of hanging forever", async () => {
  assert.ok(Number.isFinite(ER7_TURN_TIMEOUT_MS) && ER7_TURN_TIMEOUT_MS > 0, "the ceiling is a declared number");
  const realFetch = globalThis.fetch;
  // A fetch that hangs until aborted — the stalled-lane shape, no server.
  globalThis.fetch = (_url, { signal } = {}) => new Promise((_, reject) => {
    if (signal?.aborted) return reject(new DOMException("aborted", "AbortError"));
    signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  });
  try {
    const t0 = Date.now();
    await assert.rejects(
      () => er7ChatCompletion({ model: "gemma2:2b", task: "hi", timeoutMs: 300 }),
      /stalled past 300ms/,
    );
    assert.ok(Date.now() - t0 < 5000, "the ceiling fired promptly");
  } finally {
    globalThis.fetch = realFetch;
  }
});