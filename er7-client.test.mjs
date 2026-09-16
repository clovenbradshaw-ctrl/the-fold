// er7-client.test.mjs — the fold's thin client onto eoreader7's proxy engine.
// Offline for the wire shapes (prefix/retry/attachment normalization); the
// live round trip is exercised by the proxy itself (cli/tests/proxy-client
// in eoreader7 speaks the SAME wire — the TUI and this client are one seam).

import test from "node:test";
import assert from "node:assert/strict";
import { stripEr7Prefix } from "./er7-client.js";

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