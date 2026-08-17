// github.test.mjs — the GitHub organ's pure half, tested offline. No fetch
// anywhere in github.js (same posture as web.js), so there is nothing to
// stub: these tests pin what the organ does to data it is GIVEN — device
// flow response shapes, Contents API payload building/parsing, base64
// round-tripping, the repo-path convention, and the pull-merge set
// differences skills/history sync rely on.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  GITHUB_APP_CLIENT_ID,
  base64EncodeUtf8,
  base64DecodeUtf8,
  repoPathForSkill,
  repoPathForHistory,
  nameFromRepoPath,
  GITHUB_SKILLS_PREFIX,
  GITHUB_HISTORY_PREFIX,
  buildDeviceCodeBody,
  buildAccessTokenBody,
  parseDeviceCodeResponse,
  parseAccessTokenResponse,
  nextPollIntervalMs,
  deviceFlowExpired,
  DeviceFlowError,
  encodeContentsPath,
  contentsUrl,
  decodeContentsGet,
  buildContentsWriteBody,
  decodeContentsWrite,
  shouldRetryConflict,
  MAX_CONFLICT_RETRIES,
  mergeSkillsPull,
  mergeHistoryPull,
} from "./github.js";

// ── base64 ───────────────────────────────────────────────────────────────────
test("base64EncodeUtf8/base64DecodeUtf8 round-trip through non-ASCII", () => {
  for (const s of ["", "plain ascii", "café — naïve résumé", "war and peace: Наташа", "line1\nline2\n"]) {
    assert.equal(base64DecodeUtf8(base64EncodeUtf8(s)), s);
  }
});

test("base64DecodeUtf8 tolerates GitHub's newline-wrapped base64", () => {
  const encoded = base64EncodeUtf8("hello world");
  const wrapped = encoded.match(/.{1,4}/g).join("\n");
  assert.equal(base64DecodeUtf8(wrapped), "hello world");
});

// ── repo path convention ────────────────────────────────────────────────────
test("repoPathForSkill / repoPathForHistory land under the declared prefixes", () => {
  assert.equal(repoPathForSkill("abc123"), ".the-fold/skills/abc123.json");
  assert.equal(repoPathForHistory("build-4"), ".the-fold/history/build-4.json");
});

test("nameFromRepoPath recovers the digest/slug, or refuses a path outside the prefix", () => {
  assert.equal(nameFromRepoPath(".the-fold/skills/abc123.json", GITHUB_SKILLS_PREFIX), "abc123");
  assert.equal(nameFromRepoPath(".the-fold/history/build-4.json", GITHUB_HISTORY_PREFIX), "build-4");
  assert.equal(nameFromRepoPath(".the-fold/skills/abc123.json", GITHUB_HISTORY_PREFIX), null);
  assert.equal(nameFromRepoPath("README.md", GITHUB_SKILLS_PREFIX), null);
});

// ── device flow ──────────────────────────────────────────────────────────────
test("buildDeviceCodeBody / buildAccessTokenBody carry the app's client id", () => {
  assert.equal(buildDeviceCodeBody().client_id, GITHUB_APP_CLIENT_ID);
  const body = buildAccessTokenBody("dc-1");
  assert.equal(body.client_id, GITHUB_APP_CLIENT_ID);
  assert.equal(body.device_code, "dc-1");
  assert.equal(body.grant_type, "urn:ietf:params:oauth:grant-type:device_code");
});

test("parseDeviceCodeResponse shapes a good relay reply, throws a typed error otherwise", () => {
  const good = parseDeviceCodeResponse({ device_code: "dc", user_code: "ABCD-1234", verification_uri: "https://github.com/login/device", expires_in: 900, interval: 5 });
  assert.deepEqual(good, { device_code: "dc", user_code: "ABCD-1234", verification_uri: "https://github.com/login/device", expires_in: 900, interval: 5 });
  assert.throws(() => parseDeviceCodeResponse({ error: "access_denied" }), DeviceFlowError);
  assert.throws(() => parseDeviceCodeResponse(null), DeviceFlowError);
});

test("parseAccessTokenResponse distinguishes ok / pending / slow_down / error", () => {
  assert.deepEqual(parseAccessTokenResponse({ access_token: "gho_x" }), { status: "ok", token: "gho_x" });
  assert.deepEqual(parseAccessTokenResponse({ error: "authorization_pending" }), { status: "pending" });
  assert.deepEqual(parseAccessTokenResponse({ error: "slow_down" }), { status: "slow_down" });
  assert.deepEqual(parseAccessTokenResponse({ error: "expired_token" }), { status: "error", code: "expired_token" });
  assert.deepEqual(parseAccessTokenResponse({}), { status: "error", code: "unknown_error" });
});

test("nextPollIntervalMs backs off on slow_down only", () => {
  assert.equal(nextPollIntervalMs(5000, "pending"), 5000);
  assert.equal(nextPollIntervalMs(5000, "slow_down"), 10000);
});

test("deviceFlowExpired reads the declared clock, not wall time guessing", () => {
  const start = { startedAt: 1000, expiresInSec: 10 };
  assert.equal(deviceFlowExpired(start, 1000 + 9000), false);
  assert.equal(deviceFlowExpired(start, 1000 + 11000), true);
});

// ── Contents API payloads ───────────────────────────────────────────────────
test("encodeContentsPath / contentsUrl build the API address, slashes structural", () => {
  assert.equal(encodeContentsPath(".the-fold/skills/ab cd.json"), ".the-fold/skills/ab%20cd.json");
  assert.equal(
    contentsUrl({ owner: "acme", repo: "notes", path: ".the-fold/history/build-4.json" }),
    "https://api.github.com/repos/acme/notes/contents/.the-fold/history/build-4.json",
  );
});

test("decodeContentsGet: a file, a directory listing, and a 404-shaped absence", () => {
  const file = decodeContentsGet({ sha: "sha1", content: base64EncodeUtf8("hello") + "\n" });
  assert.deepEqual(file, { exists: true, isDirectory: false, sha: "sha1", text: "hello" });

  const dir = decodeContentsGet([{ name: "a.json", path: ".the-fold/skills/a.json", sha: "s1", type: "file" }]);
  assert.equal(dir.isDirectory, true);
  assert.equal(dir.entries.length, 1);
  assert.equal(dir.entries[0].name, "a.json");

  assert.deepEqual(decodeContentsGet(null), { exists: false });
});

test("buildContentsWriteBody encodes content, carries sha only when given, defaults the message", () => {
  const withSha = buildContentsWriteBody({ content: "x", sha: "s1", message: "m" });
  assert.equal(withSha.message, "m");
  assert.equal(withSha.sha, "s1");
  assert.equal(base64DecodeUtf8(withSha.content), "x");

  const noSha = buildContentsWriteBody({ content: "y" });
  assert.equal("sha" in noSha, false);
  assert.ok(noSha.message.length > 0);
});

test("decodeContentsWrite reads the new sha", () => {
  assert.deepEqual(decodeContentsWrite({ content: { sha: "s2" } }), { sha: "s2" });
  assert.deepEqual(decodeContentsWrite({}), { sha: null });
});

test("shouldRetryConflict bounds the conflict-retry loop", () => {
  assert.equal(shouldRetryConflict(0), true);
  assert.equal(shouldRetryConflict(MAX_CONFLICT_RETRIES - 1), true);
  assert.equal(shouldRetryConflict(MAX_CONFLICT_RETRIES), false);
});

// ── pull merges ──────────────────────────────────────────────────────────────
test("mergeSkillsPull imports only digests not already held locally", () => {
  const remote = [
    { path: ".the-fold/skills/aaa.json" },
    { path: ".the-fold/skills/bbb.json" },
    { path: ".the-fold/skills/README.md" }, // not a skill file — ignored
  ];
  const { toImport } = mergeSkillsPull(new Set(["aaa"]), remote);
  assert.deepEqual(toImport.map((e) => e.digest), ["bbb"]);
});

test("mergeHistoryPull imports only slugs not already held locally", () => {
  const remote = [{ path: ".the-fold/history/build-1.json" }, { path: ".the-fold/history/build-2.json" }];
  const { toImport } = mergeHistoryPull(["build-1"], remote);
  assert.deepEqual(toImport.map((e) => e.slug), ["build-2"]);
});
