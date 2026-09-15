// opencode-import.js — pure normalization of opencode's own local session
// data (already-fetched WebFetch tool results, sitting in opencode's own
// SQLite store on this machine) into the shape explore-server.mjs's web
// history already uses. No I/O here: the crossing (reading opencode's db,
// writing content-addressed files, appending web/history.jsonl) lives in
// explore-server.mjs, mirroring the web.js (pure) / explore-server.mjs
// (crossing) split P13 already established for the live web organ — this
// is the identical split one register over. opencode is a SOURCE ALREADY
// ON DISK, never a network fetch of its own, but "extraction shape first,
// crossing second, nothing pure touches a file or a socket" is the same
// discipline.
//
// PROVENANCE, NOT A LIVE FETCH (P67 — "a reading is Talmud, not a cache").
// An imported entry is never confused with something this instrument
// fetched just now: `retrievedAt` is opencode's own original fetch
// timestamp, never "now", and every entry carries
// `via: {source: "opencode-import", sessionId, partId, tool}` so a reader
// can always tell an imported historical fetch from a fresh one. No raw
// HTML face exists — opencode's own WebFetch tool hands back extracted
// readable text, never raw bytes — so `rawPath` is honestly null rather
// than invented, and `status` (the HTTP status) is honestly null too:
// opencode's own tool result carries no such field, and guessing 200 would
// be exactly the kind of fabricated fact P4 forbids.

import crypto from "node:crypto";

/** A `part` row's `data` column, parsed — `{type, tool, callID, state}`. */
function parsePartData(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * A webfetch tool call's own opencode-recorded metadata title reads
 * "<url> (<content-type>)" — never the PAGE's own `<title>`, which
 * opencode's WebFetch tool does not preserve (it hands back extracted
 * readable text, not the raw HTML a `<title>` tag lives in). Parsed here
 * for the content-type alone; never reused as a page title, which would
 * conflate the tool's own bookkeeping with the page's real identity.
 */
export function contentTypeFromToolTitle(toolTitle) {
  const m = /\(([^()]+)\)\s*$/.exec(String(toolTitle ?? ""));
  return m ? m[1].trim() : null;
}

/**
 * Normalize one opencode `part` row (the caller has already filtered to
 * `tool:"webfetch"` rows — this function still checks, so a caller that
 * forgot the filter fails closed rather than importing something else) into
 * `{url, sessionId, partId, contentType, text, retrievedAt}`, or `null`
 * when the row carries nothing importable: an incomplete or errored call,
 * a missing URL, or empty extracted text.
 */
export function normalizeOpencodePart(row) {
  const data = parsePartData(row?.data);
  if (!data || data.type !== "tool" || data.tool !== "webfetch") return null;
  const state = data.state ?? {};
  if (state.status !== "completed") return null;
  const url = state.input?.url;
  const text = state.output;
  if (typeof url !== "string" || !url.trim()) return null;
  if (typeof text !== "string" || !text.trim()) return null;
  const startMs = state.time?.start;
  const retrievedAt = Number.isFinite(startMs) ? new Date(startMs).toISOString() : null;
  return {
    url: url.trim(),
    sessionId: row.session_id ?? null,
    partId: row.id ?? null,
    contentType: contentTypeFromToolTitle(state.title),
    text,
    retrievedAt,
  };
}

/** Every importable row of a raw opencode `part` query result, in order. */
export function normalizeOpencodeParts(rows) {
  const out = [];
  for (const row of rows ?? []) {
    const n = normalizeOpencodePart(row);
    if (n) out.push(n);
  }
  return out;
}

/**
 * The history-entry shape explore-server.mjs's web store already keeps
 * (`fetchAndKeep`'s own `entry`), built from one imported opencode fetch.
 * The caller supplies the sha256 and the saved text file's own repo-
 * relative path — this stays pure, nothing here touches a filesystem.
 */
export function opencodeImportEntry({ url, sessionId, partId, contentType, text, retrievedAt, sha256, textPath }) {
  return {
    id: crypto.randomUUID(),
    url,
    finalUrl: url,
    status: null,
    contentType: contentType ?? null,
    title: null,
    retrievedAt,
    bytes: Buffer.byteLength(text, "utf8"),
    textChars: text.length,
    sha256,
    rawPath: null,
    textPath,
    via: { source: "opencode-import", sessionId, partId, tool: "webfetch" },
    archive: null,
  };
}

/**
 * A distinct-session summary over normalized parts — one row per
 * `sessionId`, its webfetch count and the most recent `retrievedAt` among
 * them — so a caller (the `/api/opencode/sessions` door) can offer a
 * person a real choice of what to import instead of one flat dump. Rows
 * with no `retrievedAt` sort last within their session, never first.
 */
export function opencodeSessionSummary(normalizedParts) {
  const bySession = new Map();
  for (const p of normalizedParts) {
    const key = p.sessionId ?? "(unknown session)";
    const cur = bySession.get(key) ?? { sessionId: key, count: 0, latest: null };
    cur.count += 1;
    if (p.retrievedAt && (!cur.latest || p.retrievedAt > cur.latest)) cur.latest = p.retrievedAt;
    bySession.set(key, cur);
  }
  return [...bySession.values()].sort((a, b) => (b.latest ?? "").localeCompare(a.latest ?? ""));
}
