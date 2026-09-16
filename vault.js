// vault.js — the local vault, extended past matrix.js's own shape: encrypting
// what the-fold keeps at rest OUTSIDE the browser's storage too — the ledgers
// eoreader7's proxy-runner.mjs writes to its own disk — under a key the
// server never sees.
//
// Nothing here invents a cipher. Every primitive is matrix.js's: AES-256-GCM
// (encryptBytes/decryptBytes), PBKDF2 (keyFromPassphrase, KDF_ROUNDS), ECDH
// wrap/unwrap (wrapChatKey/unwrapChatKey), and sealVault/openVault itself —
// "the local vault: everything FoldMatrix keeps at rest, sealed under a
// passphrase-derived key." This file widens what "at rest" covers (a raw-byte
// OPFS blob, not only localStorage's base64-in-JSON) and adds a SECOND key
// source (a Matrix identity, so the vault key follows a person across
// devices) beside the passphrase matrix.js already derives one from.
//
// Threat model, stated once and meant literally: this protects a vault blob
// on disk or in a backup, and cross-origin access, from reading anything
// without the key. It does NOT protect against a compromised browser process
// or a malicious extension running inside the same page — anything that can
// read this page's memory while the vault is open can read the vault. Say so
// wherever this is surfaced; never oversell it.
//
// PURE: no fetch, no DOM, no storage. vault-client.js is the crossing that
// actually touches navigator.storage — this file only decides what bytes go
// where and how they are keyed, the same split matrix.js/matrix-client.js
// already draw.

import {
  KDF_ROUNDS, generateSalt, keyFromPassphrase, generateChatKey,
  encryptBytes, decryptBytes, wrapChatKey, unwrapChatKey,
  b64, unb64,
} from "./matrix.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SALT_BYTES = 16;

// ── the OPFS vault blob: RAW BYTES, never base64-in-JSON ───────────────────
// [salt(16)][iv(12)][ciphertext+tag] — one flat buffer, so the crossing layer
// can hand it straight to a FileSystemSyncAccessHandle with no encoding step.
// matrix.js's own sealVault keeps its salt/rounds/blob as JSON fields because
// localStorage only holds strings; OPFS holds bytes, so this format drops
// that indirection rather than restating it.
export const VAULT_BLOB_VERSION = 1;

/** Derive the vault's AES key from a passphrase and a (possibly fresh) salt.
 * `KDF_ROUNDS` is matrix.js's own figure (600,000) — not re-declared here. */
export async function deriveVaultKey(passphrase, salt = generateSalt()) {
  if (!(salt instanceof Uint8Array) || salt.length !== SALT_BYTES) throw new Error(`a vault salt is ${SALT_BYTES} bytes`);
  const key = await keyFromPassphrase(passphrase, salt, KDF_ROUNDS);
  return { key, salt };
}

/** Seal an object into the raw-bytes OPFS shape. Returns the flat buffer the
 * crossing layer writes verbatim — never JSON, never base64. */
export async function sealVaultBlob(key, obj, { salt = generateSalt() } = {}) {
  if (!(salt instanceof Uint8Array) || salt.length !== SALT_BYTES) throw new Error(`a vault salt is ${SALT_BYTES} bytes`);
  const plaintext = encoder.encode(JSON.stringify(obj));
  const envelope = await encryptBytes(key, plaintext);
  const out = new Uint8Array(SALT_BYTES + envelope.length);
  out.set(salt, 0);
  out.set(envelope, SALT_BYTES);
  return out;
}

/** Seal directly from a passphrase — derives a fresh salt, derives the key,
 * seals, and hands back both the blob and the key (so the caller can hold
 * the key in memory for the rest of the session without re-deriving it on
 * every write). Mirrors matrix.js's own sealVault(passphrase, obj) shape. */
export async function sealVaultBlobWithPassphrase(passphrase, obj) {
  const { key, salt } = await deriveVaultKey(passphrase);
  const blob = await sealVaultBlob(key, obj, { salt });
  return { blob, key };
}

/** Open a vault blob sealed with a KEY already in hand (the in-memory key a
 * session already unlocked — no re-derivation, no passphrase asked twice). */
export async function openVaultBlobWithKey(key, blob) {
  if (!(blob instanceof Uint8Array) || blob.length <= SALT_BYTES) throw new Error("not a vault blob");
  const plaintext = await decryptBytes(key, blob.subarray(SALT_BYTES));
  return JSON.parse(decoder.decode(plaintext));
}

/** Open a vault blob from a passphrase alone — reads the salt out of the
 * blob itself, derives the key, and opens it. Throws "the passphrase does
 * not open this vault" style errors straight from matrix.js's decryptBytes. */
export async function openVaultBlobWithPassphrase(passphrase, blob) {
  if (!(blob instanceof Uint8Array) || blob.length <= SALT_BYTES) throw new Error("not a vault blob");
  const salt = blob.subarray(0, SALT_BYTES);
  const { key } = await deriveVaultKey(passphrase, salt);
  const data = await openVaultBlobWithKey(key, blob);
  return { data, key };
}

// ── key sourcing priority chain ─────────────────────────────────────────────
// 1. Matrix-derived  2. Browser passphrase-derived  3. none yet (queue only)
// 4. Explicit opt-out (plaintext to a private GitHub repo — space-seal.js's
//    own convention; not this module's concern, referenced not duplicated).
export const KEY_SOURCE = Object.freeze({
  matrix: "matrix",
  passphrase: "passphrase",
  none: "none",
});

/**
 * Decide which key source a session should use, in the declared priority
 * order, from plain booleans the caller already knows (logged in? a key
 * already unlocked this session? a vault file exists on disk?). Pure
 * decision table — no fetch, no DOM — so the crossing layer's job is only to
 * supply true/false answers to these three questions.
 */
export function keySourceFor({ matrixLoggedIn = false, passphraseVaultExists = false } = {}) {
  if (matrixLoggedIn) return KEY_SOURCE.matrix;
  if (passphraseVaultExists) return KEY_SOURCE.passphrase;
  return KEY_SOURCE.none;
}

// ── the vault key wrapped to a Matrix identity, so it follows the account ──
// Same shape the room's own chat key already takes when it is wrapped to a
// member (matrix.js's wrapChatKey/unwrapChatKey — a fresh ephemeral pair per
// wrap, so the wrapped blob opens only with the recipient's own private key).
// Here the "recipient" is this account's OWN device keypair — the vault key
// rides in Matrix account_data (private, per-account, syncs to every signed-in
// device — matrix.js's own `paths.accountData` docstring) wrapped once per
// known device public key, mirroring `siblingContent`'s per-device list.
export const VAULT_KEY_ACCOUNT_DATA_TYPE = "fold.vault_key";

/** Wrap a vault key for one device's public key — literally wrapChatKey,
 * renamed at the call site only so a reader of this file sees what it is
 * being used for; no new bytes, no new math. */
export async function wrapVaultKeyForDevice(devicePubB64, vaultKey) {
  return wrapChatKey(devicePubB64, vaultKey);
}

/** The reverse: open this device's own wrapped copy with its private key. */
export async function unwrapVaultKeyForDevice(devicePrivateKey, wrapped) {
  return unwrapChatKey(devicePrivateKey, wrapped);
}

/** The account_data content shape: one wrap per known device, keyed by that
 * device's own public key (b64) so a device can find its own entry without
 * trial-decrypting every wrap. `v` mirrors matrix.js's own versioned shapes
 * (chatKeyContent, siblingContent). */
export function vaultKeyAccountData(wrapsByDevicePub) {
  return { v: 1, wraps: Object.entries(wrapsByDevicePub).map(([pub, w]) => ({ pub, eph_pub: w.eph_pub, blob: w.blob })) };
}

/** Find and unwrap this device's own entry from the account_data content
 * fetched from a homeserver, or null if this device has none yet (it has
 * never published its public key there, or nobody has wrapped for it yet). */
export async function openVaultKeyFromAccountData(content, devicePrivateKey, devicePubB64) {
  const entry = (content?.wraps ?? []).find((w) => w.pub === devicePubB64);
  if (!entry) return null;
  return unwrapVaultKeyForDevice(devicePrivateKey, entry);
}

// ── first-generation vault key ──────────────────────────────────────────────
/** A fresh, random vault key — the same 32 random bytes a chat key is
 * (generateChatKey), reused rather than a parallel "generateVaultKey". */
export const generateVaultKey = generateChatKey;

// ── the pending-write queue: "no key yet" ───────────────────────────────────
// A pure, storage-agnostic shape. The crossing layer persists this list to
// OPFS as-is (JSON is fine here — it is queued PLAINTEXT, never written to
// the eoreader7 server; it only ever leaves this browser once a key exists
// and the entry is sealed and flushed). Every entry names what it is and
// carries its own payload, so a later flush can seal and route each kind
// without guessing.
export function makePendingQueue(entries = []) {
  return { v: 1, entries: entries.slice() };
}

export function queueWrite(queue, { kind, payload, queuedAt = Date.now() } = {}) {
  if (!kind) throw new Error("a queued write names its kind");
  return { v: 1, entries: [...queue.entries, { kind, payload, queuedAt }] };
}

/** Seal every queued entry under a newly-available key, returning the sealed
 * blobs ready to flush plus an EMPTIED queue — draining is a single atomic
 * step so a crash mid-flush cannot double-send or silently drop an entry
 * (the caller persists the emptied queue only after every blob is written). */
export async function drainQueue(queue, key) {
  const sealed = [];
  for (const entry of queue.entries) {
    sealed.push({ kind: entry.kind, blob: await sealVaultBlob(key, entry.payload), queuedAt: entry.queuedAt });
  }
  return { sealed, queue: makePendingQueue([]) };
}

export const pendingCount = (queue) => queue.entries.length;

// ── b64 passthrough, for callers that need to show/store a key as text ─────
export { b64, unb64 };
