// space-seal.test.mjs — the rule that decides plaintext from ciphertext, and
// the round trip that has to survive it. Runs against the REAL sealing in
// matrix.js (WebCrypto via node:crypto's webcrypto), never a stub: the point
// of the module is that there is one cipher, so testing a second one would
// test nothing that ships.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  SEALED_SUFFIX,
  isSealedPath,
  sealedPath,
  plainPath,
  newSpaceKey,
  sealFile,
  openFile,
  spaceLink,
  parseSpaceLink,
  mustSeal,
} from "./space-seal.js";

test("mustSeal: only a known-private destination goes in the clear", () => {
  assert.equal(mustSeal("private"), false);
  assert.equal(mustSeal("public"), true);
  // The load-bearing case: an unknown visibility seals. Publishing in the
  // clear by accident is the failure that matters; sealing something that
  // did not need it costs nothing but a key.
  assert.equal(mustSeal(undefined), true);
  assert.equal(mustSeal(null), true);
  assert.equal(mustSeal("unknown"), true);
});

test("a sealed path names itself, and the naming round-trips", () => {
  assert.equal(sealedPath(".the-fold/history/build-1.json"), `.the-fold/history/build-1.json${SEALED_SUFFIX}`);
  assert.equal(isSealedPath(sealedPath("a.json")), true);
  assert.equal(isSealedPath("a.json"), false);
  assert.equal(plainPath(sealedPath("a.json")), "a.json");
  assert.equal(sealedPath(sealedPath("a.json")), sealedPath("a.json")); // idempotent
});

test("seal then open returns the exact bytes, through a real key", async () => {
  const key = newSpaceKey();
  const file = { path: ".the-fold/history/build-1.json", content: '{"n":1,"turn":"a fold\'s own words"}\n' };
  const sealed = await sealFile(key, file);
  assert.equal(sealed.path, sealedPath(file.path));
  // what lands in the repo must not contain the plaintext anywhere in it
  assert.equal(sealed.content.includes("a fold's own words"), false);
  const outer = JSON.parse(sealed.content);
  assert.equal(outer.fold, "sealed-space");
  assert.equal(outer.alg, "AES-256-GCM");
  const opened = await openFile(key, sealed);
  assert.deepEqual(opened, file);
});

test("a wrong key does not half-open a file — it throws", async () => {
  const sealed = await sealFile(newSpaceKey(), { path: "a.json", content: "secret" });
  await assert.rejects(() => openFile(newSpaceKey(), sealed));
});

test("a file that is not a sealed space file is refused by name", async () => {
  await assert.rejects(
    () => openFile(newSpaceKey(), { path: "a.json.sealed", content: '{"just":"json"}' }),
    /not a sealed space file/,
  );
});

test("the share link carries the key in the fragment, never the query", () => {
  const key = newSpaceKey();
  const link = spaceLink("https://example.test/fold/", "owner/repo", key);
  const url = new URL(link);
  // the key must be after the '#': a fragment is not sent to the server
  assert.equal(url.search, "");
  assert.match(url.hash, /k=/);
  assert.equal(url.hash.includes(key), true);
  assert.deepEqual(parseSpaceLink(url.hash), { fullName: "owner/repo", key });
});

test("parseSpaceLink refuses anything that is not a repo and a key", () => {
  assert.equal(parseSpaceLink(""), null);
  assert.equal(parseSpaceLink("#space=owner/repo"), null); // no key
  assert.equal(parseSpaceLink("#k=abc"), null); // no space
  assert.equal(parseSpaceLink("#space=notarepo&k=abc"), null);
  assert.equal(parseSpaceLink("#space=../../etc&k=abc"), null);
});
