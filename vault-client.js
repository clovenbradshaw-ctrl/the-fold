// vault-client.js — the crossing for vault.js: the one place that actually
// touches navigator.storage. matrix.js has matrix-client.js; space-seal.js
// rides matrix-client.js's own fetches; vault.js had no crossing at all
// until this file — the missing storage-crossing layer its own header names.
//
// OPFS, not IndexedDB, by direct design (the person's own spec for this
// feature): navigator.storage.getDirectory() + FileSystemSyncAccessHandle,
// raw ciphertext bytes on disk, never base64-in-JSON. A sync access handle
// only exists inside a Worker in most engines today — every function here is
// written to run there; a caller on the main thread should proxy through one
// rather than expect these to work inline (documented per function).
//
// Nothing here decides WHAT to encrypt or WHEN — that is vault.js and the
// caller (app.js). This file only knows how to get bytes onto and off of
// this origin's private file system.

const VAULT_DIR = "fold-vault";
const VAULT_FILE = "vault.bin";
const PENDING_FILE = "pending.json";
const AUTO_KEY_FILE = "auto.key";

async function vaultDirHandle({ create = true } = {}) {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(VAULT_DIR, { create });
}

/** Open a sync access handle for a named file inside the vault directory.
 * MUST run inside a Worker (or a context with OPFS sync-access support) —
 * the browser refuses this on the main thread in the engines this targets. */
async function syncHandleFor(name, { create = true } = {}) {
  const dir = await vaultDirHandle({ create });
  const fileHandle = await dir.getFileHandle(name, { create });
  return fileHandle.createSyncAccessHandle();
}

/** Write a raw byte buffer to the named vault file, truncating whatever was
 * there before — a vault write is always a full replace, never an append
 * (the sealed blob IS the whole vault; there is nothing to accumulate). */
export async function writeVaultBytes(bytes, { name = VAULT_FILE } = {}) {
  const handle = await syncHandleFor(name);
  try {
    handle.truncate(0);
    handle.write(bytes, { at: 0 });
    handle.flush();
  } finally {
    handle.close();
  }
}

/** Read the raw byte buffer back, or null if nothing has been written yet
 * (a fresh origin, or a session that has not set up a vault at all — this is
 * the "no key yet" state's own on-disk fact, distinct from an error). */
export async function readVaultBytes({ name = VAULT_FILE } = {}) {
  let handle;
  try {
    handle = await syncHandleFor(name, { create: false });
  } catch {
    return null;
  }
  try {
    const size = handle.getSize();
    if (size === 0) return null;
    const buf = new Uint8Array(size);
    handle.read(buf, { at: 0 });
    return buf;
  } finally {
    handle.close();
  }
}

export async function vaultExists({ name = VAULT_FILE } = {}) {
  const bytes = await readVaultBytes({ name });
  return bytes !== null;
}

export async function deleteVault({ name = VAULT_FILE } = {}) {
  try {
    const dir = await vaultDirHandle({ create: false });
    await dir.removeEntry(name);
  } catch { /* nothing to delete */ }
}

/** The "forgot your passphrase" door: delete the sealed vault so a fresh
 * passphrase can be set. Deliberately touches ONLY the vault file — the
 * pending queue (vault.js's makePendingQueue) is plaintext, keyed to
 * nothing, and unaffected by which passphrase eventually seals it, so a
 * reset never loses work still waiting for a key. There is no other half
 * to this: the old vault's bytes are gone, by design (vault.js's own
 * VAULT_RESET_WARNING is the words a caller shows before calling this). */
export async function resetVault() {
  await deleteVault({ name: VAULT_FILE });
}

// ── the pending-write queue: persisted as JSON on purpose ──────────────────
// The queue holds plaintext by construction (vault.js's own header: it is
// what "no key yet" means) — nothing in it is more sensitive at rest than an
// ordinary unsaved document already sitting in this origin's storage, so
// there is no reason to route it through a sync access handle's raw-bytes
// discipline the way the sealed vault itself must. JSON keeps it easy to
// inspect and to migrate as its shape grows.
export async function writePendingQueue(queue) {
  const bytes = new TextEncoder().encode(JSON.stringify(queue));
  await writeVaultBytes(bytes, { name: PENDING_FILE });
}

export async function readPendingQueue() {
  const bytes = await readVaultBytes({ name: PENDING_FILE });
  if (!bytes) return { v: 1, entries: [] };
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { v: 1, entries: [] };
  }
}

// ── the automatic key: stored plainly, on purpose (vault.js's own header
// says why — this is what "auto" means) ─────────────────────────────────────
export async function writeAutoKey(bytes) {
  await writeVaultBytes(bytes, { name: AUTO_KEY_FILE });
}
export async function readAutoKey() {
  return readVaultBytes({ name: AUTO_KEY_FILE });
}
export async function hasAutoKey() {
  return (await readAutoKey()) !== null;
}
/** Called on upgrade (setting a passphrase/passkey after "auto" mode) so a
 * stale auto key never sits on disk after the vault it once opened has been
 * resealed under something else — not a security hole either way (a stale
 * key can't open a vault sealed under a different one), just clutter this
 * keeps out. */
export async function deleteAutoKey() {
  await deleteVault({ name: AUTO_KEY_FILE });
}

/** Whether this runtime can even attempt OPFS sync access — checked once by
 * a caller before assuming any of the above will work, rather than letting
 * every call fail one at a time. */
export function opfsSyncAvailable() {
  return typeof navigator !== "undefined"
    && !!navigator.storage?.getDirectory
    && typeof FileSystemFileHandle !== "undefined"
    && typeof FileSystemFileHandle.prototype.createSyncAccessHandle === "function";
}
