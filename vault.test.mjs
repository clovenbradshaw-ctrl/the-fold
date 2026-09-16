// vault.test.mjs — conformance tests for vault.js against the REAL matrix.js
// primitives (WebCrypto via node:crypto's webcrypto), the same posture
// matrix.test.mjs and space-seal.test.mjs already hold: one cipher, tested
// once, never a stub standing in for it.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  VAULT_BLOB_VERSION,
  deriveVaultKey,
  sealVaultBlob,
  openVaultBlobWithKey,
  openVaultBlobWithPassphrase,
  KEY_SOURCE,
  keySourceFor,
  wrapVaultKeyForDevice,
  unwrapVaultKeyForDevice,
  vaultKeyAccountData,
  openVaultKeyFromAccountData,
  generateVaultKey,
  makePendingQueue,
  queueWrite,
  drainQueue,
  pendingCount,
} from "./vault.js";
import { generateIdentity, exportPublicKey } from "./matrix.js";

test("VAULT_BLOB_VERSION is a stable constant", () => {
  assert.equal(VAULT_BLOB_VERSION, 1);
});

test("deriveVaultKey: a fresh salt each time, a 32-byte key", async () => {
  const { key: k1, salt: s1 } = await deriveVaultKey("correct horse battery staple");
  const { key: k2, salt: s2 } = await deriveVaultKey("correct horse battery staple");
  assert.equal(k1.length, 32);
  assert.notDeepEqual(s1, s2, "a fresh salt is generated when none is supplied");
  assert.notDeepEqual(k1, k2, "different salts derive different keys from the same passphrase");
});

test("deriveVaultKey: the same passphrase and salt derive the same key", async () => {
  const { key: k1, salt } = await deriveVaultKey("a passphrase");
  const { key: k2 } = await deriveVaultKey("a passphrase", salt);
  assert.deepEqual(k1, k2);
});

test("seal/open round trip with a passphrase: raw bytes, not JSON", async () => {
  const { key } = await deriveVaultKey("hunter2");
  const blob = await sealVaultBlob(key, { hello: "vault", n: 42 });
  assert.ok(blob instanceof Uint8Array);
  const text = new TextDecoder().decode(blob);
  assert.ok(!text.includes("hello"), "the blob is ciphertext, not plaintext JSON");
  const opened = await openVaultBlobWithKey(key, blob);
  assert.deepEqual(opened, { hello: "vault", n: 42 });
});

test("openVaultBlobWithPassphrase: derives its own key from the blob's own salt", async () => {
  const { key, salt } = await deriveVaultKey("correct horse battery staple");
  const blob = await sealVaultBlob(key, { note: "sealed with a derived key" }, { salt });
  const { data } = await openVaultBlobWithPassphrase("correct horse battery staple", blob);
  assert.deepEqual(data, { note: "sealed with a derived key" });
});

test("a wrong passphrase refuses to open — never silently returns garbage", async () => {
  const { key, salt } = await deriveVaultKey("the right words");
  const blob = await sealVaultBlob(key, { secret: true }, { salt });
  await assert.rejects(() => openVaultBlobWithPassphrase("the wrong words", blob));
});

test("keySourceFor: matrix beats passphrase, passphrase beats none", () => {
  assert.equal(keySourceFor({ matrixLoggedIn: true, passphraseVaultExists: true }), KEY_SOURCE.matrix);
  assert.equal(keySourceFor({ matrixLoggedIn: false, passphraseVaultExists: true }), KEY_SOURCE.passphrase);
  assert.equal(keySourceFor({ matrixLoggedIn: false, passphraseVaultExists: false }), KEY_SOURCE.none);
  assert.equal(keySourceFor(), KEY_SOURCE.none);
});

test("vault key wrapped to a device's ECDH public key, and unwrapped back", async () => {
  const vaultKey = generateVaultKey();
  const device = await generateIdentity();
  const devicePub = await exportPublicKey(device.publicKey);
  const wrapped = await wrapVaultKeyForDevice(devicePub, vaultKey);
  const opened = await unwrapVaultKeyForDevice(device.privateKey, wrapped);
  assert.deepEqual(opened, vaultKey);
});

test("vaultKeyAccountData + openVaultKeyFromAccountData: multi-device shape", async () => {
  const vaultKey = generateVaultKey();
  const laptop = await generateIdentity();
  const phone = await generateIdentity();
  const laptopPub = await exportPublicKey(laptop.publicKey);
  const phonePub = await exportPublicKey(phone.publicKey);

  const content = vaultKeyAccountData({
    [laptopPub]: await wrapVaultKeyForDevice(laptopPub, vaultKey),
    [phonePub]: await wrapVaultKeyForDevice(phonePub, vaultKey),
  });

  const fromLaptop = await openVaultKeyFromAccountData(content, laptop.privateKey, laptopPub);
  const fromPhone = await openVaultKeyFromAccountData(content, phone.privateKey, phonePub);
  assert.deepEqual(fromLaptop, vaultKey);
  assert.deepEqual(fromPhone, vaultKey);
});

test("a device with no published wrap gets null, not a throw or a guess", async () => {
  const vaultKey = generateVaultKey();
  const laptop = await generateIdentity();
  const laptopPub = await exportPublicKey(laptop.publicKey);
  const stranger = await generateIdentity();
  const strangerPub = await exportPublicKey(stranger.publicKey);

  const content = vaultKeyAccountData({ [laptopPub]: await wrapVaultKeyForDevice(laptopPub, vaultKey) });
  const opened = await openVaultKeyFromAccountData(content, stranger.privateKey, strangerPub);
  assert.equal(opened, null);
});

test("pending queue: queue, drain, and the drained queue is empty", async () => {
  let queue = makePendingQueue();
  assert.equal(pendingCount(queue), 0);
  queue = queueWrite(queue, { kind: "ledger-write", payload: { doc: "essay-1", line: { text: "hello" } } });
  queue = queueWrite(queue, { kind: "session-state", payload: { turn: 3 } });
  assert.equal(pendingCount(queue), 2);

  const key = generateVaultKey();
  const { sealed, queue: drained } = await drainQueue(queue, key);
  assert.equal(sealed.length, 2);
  assert.equal(pendingCount(drained), 0, "draining empties the queue atomically");

  const opened = await openVaultBlobWithKey(key, sealed[0].blob);
  assert.deepEqual(opened, { doc: "essay-1", line: { text: "hello" } });
});

test("queueWrite refuses an entry with no declared kind", () => {
  assert.throws(() => queueWrite(makePendingQueue(), { payload: {} }));
});
