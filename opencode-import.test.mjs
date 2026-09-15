// opencode-import.test.mjs — pinned against real opencode `part` row shapes
// (the JSON this file's own header describes reading straight off a real
// `~/.local/share/opencode/opencode.db`, not an invented fixture), offline.

import test from "node:test";
import assert from "node:assert/strict";

import {
  contentTypeFromToolTitle,
  normalizeOpencodePart,
  normalizeOpencodeParts,
  opencodeImportEntry,
  opencodeSessionSummary,
} from "./opencode-import.js";

const REAL_WEBFETCH_ROW = {
  id: "prt_fc3cadb9a001QlCBy8KIsrVMpM",
  session_id: "ses_03c352e8bffeSgrS7VjQ7vqsQ0",
  data: JSON.stringify({
    type: "tool",
    tool: "webfetch",
    callID: "toolu_018ccfyCJXz32tYBZ89PmAWh",
    state: {
      status: "completed",
      input: { url: "https://www.mollysecours.com/" },
      output: "Molly Secours | Filmmaker Writer Director\n\nSome real extracted text.",
      metadata: { truncated: false },
      title: "https://www.mollysecours.com/ (text/html; charset=UTF-8)",
      time: { start: 1785696279457, end: 1785696279644 },
    },
  }),
};

test("contentTypeFromToolTitle reads the trailing parenthetical, never the URL", () => {
  assert.equal(contentTypeFromToolTitle("https://x.example/ (text/html; charset=UTF-8)"), "text/html; charset=UTF-8");
  assert.equal(contentTypeFromToolTitle("https://x.example/"), null);
  assert.equal(contentTypeFromToolTitle(null), null);
});

test("normalizeOpencodePart reads a real completed webfetch row", () => {
  const n = normalizeOpencodePart(REAL_WEBFETCH_ROW);
  assert.ok(n);
  assert.equal(n.url, "https://www.mollysecours.com/");
  assert.equal(n.sessionId, "ses_03c352e8bffeSgrS7VjQ7vqsQ0");
  assert.equal(n.partId, "prt_fc3cadb9a001QlCBy8KIsrVMpM");
  assert.equal(n.contentType, "text/html; charset=UTF-8");
  assert.match(n.text, /Some real extracted text/);
  assert.equal(n.retrievedAt, new Date(1785696279457).toISOString());
});

test("normalizeOpencodePart refuses a non-webfetch tool row", () => {
  const grepRow = { ...REAL_WEBFETCH_ROW, data: JSON.stringify({ type: "tool", tool: "grep", state: { status: "completed", input: {}, output: "matches" } }) };
  assert.equal(normalizeOpencodePart(grepRow), null);
});

test("normalizeOpencodePart refuses an incomplete or errored call", () => {
  const pending = { ...REAL_WEBFETCH_ROW, data: JSON.stringify({ type: "tool", tool: "webfetch", state: { status: "pending", input: { url: "https://x.example/" } } }) };
  assert.equal(normalizeOpencodePart(pending), null);
  const errored = { ...REAL_WEBFETCH_ROW, data: JSON.stringify({ type: "tool", tool: "webfetch", state: { status: "error", input: { url: "https://x.example/" } } }) };
  assert.equal(normalizeOpencodePart(errored), null);
});

test("normalizeOpencodePart refuses a missing url or empty output", () => {
  const noUrl = { ...REAL_WEBFETCH_ROW, data: JSON.stringify({ type: "tool", tool: "webfetch", state: { status: "completed", input: {}, output: "text" } }) };
  assert.equal(normalizeOpencodePart(noUrl), null);
  const emptyOutput = { ...REAL_WEBFETCH_ROW, data: JSON.stringify({ type: "tool", tool: "webfetch", state: { status: "completed", input: { url: "https://x.example/" }, output: "   " } }) };
  assert.equal(normalizeOpencodePart(emptyOutput), null);
});

test("normalizeOpencodePart refuses unparseable data rather than throwing", () => {
  assert.equal(normalizeOpencodePart({ ...REAL_WEBFETCH_ROW, data: "{not json" }), null);
  assert.equal(normalizeOpencodePart(null), null);
  assert.equal(normalizeOpencodePart({}), null);
});

test("normalizeOpencodeParts keeps only what's importable, in order", () => {
  const readRow = { id: "prt_x", session_id: "ses_x", data: JSON.stringify({ type: "tool", tool: "read", state: { status: "completed", input: {}, output: "file contents" } }) };
  const out = normalizeOpencodeParts([REAL_WEBFETCH_ROW, readRow]);
  assert.equal(out.length, 1);
  assert.equal(out[0].url, "https://www.mollysecours.com/");
});

test("opencodeImportEntry never fabricates an HTTP status, a raw face, or a page title", () => {
  const n = normalizeOpencodePart(REAL_WEBFETCH_ROW);
  const entry = opencodeImportEntry({ ...n, sha256: "deadbeef".repeat(8), textPath: "web/pages/deadbeef.txt" });
  assert.equal(entry.status, null);
  assert.equal(entry.rawPath, null);
  assert.equal(entry.title, null);
  assert.equal(entry.url, "https://www.mollysecours.com/");
  assert.equal(entry.finalUrl, "https://www.mollysecours.com/");
  assert.equal(entry.contentType, "text/html; charset=UTF-8");
  assert.equal(entry.textPath, "web/pages/deadbeef.txt");
  assert.equal(entry.sha256, "deadbeef".repeat(8));
  assert.equal(entry.archive, null);
  assert.deepEqual(entry.via, { source: "opencode-import", sessionId: n.sessionId, partId: n.partId, tool: "webfetch" });
  assert.equal(entry.retrievedAt, n.retrievedAt);
  assert.ok(entry.id);
  assert.equal(entry.bytes, Buffer.byteLength(n.text, "utf8"));
  assert.equal(entry.textChars, n.text.length);
});

test("opencodeSessionSummary groups by session, newest first, unknown session named", () => {
  const older = normalizeOpencodePart(REAL_WEBFETCH_ROW);
  const newer = normalizeOpencodePart({
    id: "prt_newer",
    session_id: "ses_newer",
    data: JSON.stringify({
      type: "tool",
      tool: "webfetch",
      state: {
        status: "completed",
        input: { url: "https://later.example/" },
        output: "later text",
        title: "https://later.example/ (text/plain)",
        time: { start: 1785700000000, end: 1785700000100 },
      },
    }),
  });
  const secondInSameSession = normalizeOpencodePart({
    id: "prt_newer2",
    session_id: "ses_newer",
    data: JSON.stringify({
      type: "tool",
      tool: "webfetch",
      state: {
        status: "completed",
        input: { url: "https://later2.example/" },
        output: "more later text",
        title: "https://later2.example/ (text/plain)",
        time: { start: 1785700005000, end: 1785700005100 },
      },
    }),
  });
  const summary = opencodeSessionSummary([older, newer, secondInSameSession]);
  assert.equal(summary.length, 2);
  assert.equal(summary[0].sessionId, "ses_newer");
  assert.equal(summary[0].count, 2);
  assert.equal(summary[0].latest, secondInSameSession.retrievedAt);
  assert.equal(summary[1].sessionId, "ses_03c352e8bffeSgrS7VjQ7vqsQ0");
  assert.equal(summary[1].count, 1);
});

test("opencodeSessionSummary names an unknown session rather than dropping the row", () => {
  const row = normalizeOpencodePart({ ...REAL_WEBFETCH_ROW, session_id: null });
  const summary = opencodeSessionSummary([row]);
  assert.equal(summary.length, 1);
  assert.equal(summary[0].sessionId, "(unknown session)");
});
