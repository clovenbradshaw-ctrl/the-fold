// heimdall-invite.test.mjs — the pure half of the heimdall invite door: the
// link is the shape the heimdall site parses, the code is six digits or a
// typed refusal, recording read-modifies-writes the account registry without
// overwriting, and minting creates a public-join room through the injected
// http. No network anywhere — http and account-data I/O are stubs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mintInvite, recordCode, normalizeCode, inviteLink, CODES_TYPE, sha256Hex, HEIMDALL_SITE } from "./heimdall-invite.js";

test("normalizeCode: six digits, stripped of separators and letters; anything else is a typed refusal", () => {
  assert.equal(normalizeCode("123456"), "123456");
  assert.equal(normalizeCode("123 456"), "123456");
  assert.equal(normalizeCode("12a3b4c5d6"), "123456");
  assert.equal(normalizeCode("12345"), null);
  assert.equal(normalizeCode("1234567"), "123456");
  assert.equal(normalizeCode(""), null);
});

test("inviteLink: the shape the heimdall site parses — room, hs, host, name, exp, and no code anywhere", () => {
  const link = inviteLink({ roomId: "!abc:hs", hs: "https://hs", host: "@me:hs", name: "Alex", exp: 1234567890 });
  const u = new URL(link);
  assert.equal(u.origin + u.pathname, HEIMDALL_SITE);
  assert.equal(u.searchParams.get("room"), "!abc:hs");
  assert.equal(u.searchParams.get("hs"), "https://hs");
  assert.equal(u.searchParams.get("host"), "@me:hs");
  assert.equal(u.searchParams.get("name"), "Alex");
  assert.equal(u.searchParams.get("exp"), "1234567890");
  assert.equal(u.searchParams.get("code"), null);
  assert.equal(u.searchParams.get("c"), null);
});

test("recordCode: read-modify-write, prunes expired, refuses a duplicate without rewriting", async () => {
  let stored = { active: [{ hash: await sha256Hex("111111"), exp: Date.now() - 1 }] }; // expired, pruned
  const read = async () => stored;
  const write = async (content) => { stored = content; };
  const first = await recordCode({ code: "222222", read, write });
  assert.equal(first.ok, true);
  assert.equal(first.duplicate, false);
  assert.equal(stored.active.length, 1, "the expired entry was pruned, the new one appended");
  assert.equal(stored.active[0].hash, await sha256Hex("222222"));
  const dup = await recordCode({ code: "222222", read, write });
  assert.equal(dup.ok, true);
  assert.equal(dup.duplicate, true);
  assert.equal(stored.active.length, 1, "a duplicate never rewrites the registry");
  const bad = await recordCode({ code: "12", read, write });
  assert.equal(bad.ok, false);
  assert.equal(bad.reason, "six digits");
  assert.equal(stored.active.length, 1, "a rejected code never touches the registry");
});

test("mintInvite: creates a public-join room through the injected http and returns the link", async () => {
  const calls = [];
  const http = { createRoom: async (name, opts) => { calls.push({ name, opts }); return "!fleet:hs"; } };
  const out = await mintInvite({ http, hs: "https://hs", host: "@me:hs", name: "Alex" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].opts.isPublic, true, "a heimdall fleet room is public-join");
  assert.match(calls[0].name, /^heimdall-/);
  assert.equal(out.roomId, "!fleet:hs");
  const u = new URL(out.link);
  assert.equal(u.searchParams.get("room"), "!fleet:hs");
  assert.ok(out.exp > Date.now());
  assert.ok(out.exp < Date.now() + 8 * 24 * 3600 * 1000, "a 7-day invite");
});