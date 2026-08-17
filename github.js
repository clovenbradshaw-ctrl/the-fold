// github.js — the GitHub organ's pure half: device-flow shapes, Contents API
// payload building/parsing, base64, and the repo-path convention for syncing
// skills and history. This file OWNS NO NETWORK — same discipline as
// web.js: every github.com and n8n crossing lives in explore-server.mjs,
// which is what makes this half testable offline and keeps the browser page
// itself free of any non-localhost network call (POLICIES P13's boundary).
//
// The device flow needs a public GitHub App and two n8n relays because
// github.com's device-flow token endpoint has no CORS headers — ported from
// eoWebLLM's github-auth.ts / github-sync.ts, reusing that app (client id
// below) rather than registering a second one. See CLAUDE.md's GitHub organ
// section for why.

export const GITHUB_APP_CLIENT_ID = "Iv23livftc7ZekSCjCvL";
export const GITHUB_DEVICE_CODE_RELAY_URL = "https://n8n.intelechia.com/webhook/github-device-code";
export const GITHUB_ACCESS_TOKEN_RELAY_URL = "https://n8n.intelechia.com/webhook/github-access-token";
export const GITHUB_API = "https://api.github.com";

export const MAX_CONFLICT_RETRIES = 3;

// ── repo path convention (skills/history sync) ──────────────────────────────
// Each skill or history log lands as its own file under a dotted namespace,
// so a connected repo can hold this instrument's memory alongside whatever
// else lives there. Content-addressed for skills (skills.js's own identity:
// the digest names the file, same as local skills/<digest>.json); slug-named
// for history (builds.js's own identity: one build's log per slug, same as
// the local record/builds/<slug>.jsonl mirror).
export const GITHUB_SKILLS_PREFIX = ".the-fold/skills/";
export const GITHUB_HISTORY_PREFIX = ".the-fold/history/";

export const repoPathForSkill = (digest) => `${GITHUB_SKILLS_PREFIX}${digest}.json`;
export const repoPathForHistory = (slug) => `${GITHUB_HISTORY_PREFIX}${slug}.json`;

/** digest or slug out of a repo path this module built, or null. */
export function nameFromRepoPath(repoPath, prefix) {
  const p = String(repoPath ?? "");
  if (!p.startsWith(prefix) || !p.endsWith(".json")) return null;
  const name = p.slice(prefix.length, -".json".length);
  return name || null;
}

// ── base64, utf-8 exact ──────────────────────────────────────────────────────
// The Contents API speaks base64; content is text this instrument authored
// (skills, history, an arbitrary file), so the round trip must be exact
// through non-ASCII, not just ASCII-safe. Same construction eoWebLLM used
// (btoa/atob are the one primitive both a browser and modern Node share).
export function base64EncodeUtf8(str) {
  return btoa(unescape(encodeURIComponent(String(str ?? ""))));
}
export function base64DecodeUtf8(b64) {
  return decodeURIComponent(escape(atob(String(b64 ?? "").replace(/\n/g, ""))));
}

// ── device flow shapes ───────────────────────────────────────────────────────
export function buildDeviceCodeBody() {
  return { client_id: GITHUB_APP_CLIENT_ID };
}

export function buildAccessTokenBody(deviceCode) {
  return {
    client_id: GITHUB_APP_CLIENT_ID,
    device_code: deviceCode,
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
  };
}

export class DeviceFlowError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

/** relay JSON -> {device_code, user_code, verification_uri, expires_in, interval}, or throws. */
export function parseDeviceCodeResponse(data) {
  if (!data || !data.device_code) {
    throw new DeviceFlowError(data?.error ?? "unknown_error");
  }
  return {
    device_code: data.device_code,
    user_code: data.user_code,
    verification_uri: data.verification_uri ?? data.verification_uri_complete,
    expires_in: Number(data.expires_in) || 900,
    interval: Number(data.interval) || 5,
  };
}

/** relay JSON -> {status:"ok",token} | {status:"pending"} | {status:"error",code}. Never throws — the poll loop decides what a status means. */
export function parseAccessTokenResponse(data) {
  if (data?.access_token) return { status: "ok", token: data.access_token };
  if (data?.error === "authorization_pending") return { status: "pending" };
  if (data?.error === "slow_down") return { status: "slow_down" };
  return { status: "error", code: data?.error ?? "unknown_error" };
}

/** Poll interval in ms, after a slow_down (GitHub asks for +5s) or plain tick. */
export function nextPollIntervalMs(currentMs, status) {
  return status === "slow_down" ? currentMs + 5000 : currentMs;
}

/** Whether the device code's own clock has run out, given start + declared expires_in. */
export function deviceFlowExpired({ startedAt, expiresInSec }, now = Date.now()) {
  return now > startedAt + expiresInSec * 1000;
}

// ── Contents API payloads ────────────────────────────────────────────────────
// Path segments url-encoded individually — slashes stay structural.
export function encodeContentsPath(repoPath) {
  return String(repoPath ?? "").split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

export function contentsUrl({ owner, repo, path }) {
  return `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeContentsPath(path)}`;
}

/** A GET contents response -> {exists, sha, text} for a FILE, or {exists, isDirectory, entries} for a directory listing. text is null when the response has no inline content (too large, or a dir). */
export function decodeContentsGet(data) {
  if (Array.isArray(data)) {
    return { exists: true, isDirectory: true, entries: data.map((e) => ({ name: e.name, path: e.path, sha: e.sha, type: e.type })) };
  }
  if (!data || typeof data !== "object") return { exists: false };
  const text = typeof data.content === "string" ? base64DecodeUtf8(data.content) : null;
  return { exists: true, isDirectory: false, sha: data.sha, text };
}

export function buildContentsWriteBody({ content, sha, message }) {
  return {
    message: message || "the-fold: write via GitHub organ",
    content: base64EncodeUtf8(content),
    ...(sha ? { sha } : {}),
  };
}

export function decodeContentsWrite(data) {
  return { sha: data?.content?.sha ?? null };
}

/** Whether a write attempt should retry with a fresh sha (a stale sha lost the race). */
export function shouldRetryConflict(attempt, maxRetries = MAX_CONFLICT_RETRIES) {
  return attempt < maxRetries;
}

// ── pull merges: what to import that is not already held locally ───────────
// Pure set-difference, named per organ so the caller (github-pane.js) never
// re-derives "what's new" with its own ad hoc filter.
export function mergeSkillsPull(localDigests, remoteEntries) {
  const local = localDigests instanceof Set ? localDigests : new Set(localDigests ?? []);
  const toImport = (remoteEntries ?? [])
    .map((e) => ({ ...e, digest: nameFromRepoPath(e.path, GITHUB_SKILLS_PREFIX) }))
    .filter((e) => e.digest && !local.has(e.digest));
  return { toImport };
}

export function mergeHistoryPull(localSlugs, remoteEntries) {
  const local = localSlugs instanceof Set ? localSlugs : new Set(localSlugs ?? []);
  const toImport = (remoteEntries ?? [])
    .map((e) => ({ ...e, slug: nameFromRepoPath(e.path, GITHUB_HISTORY_PREFIX) }))
    .filter((e) => e.slug && !local.has(e.slug));
  return { toImport };
}
