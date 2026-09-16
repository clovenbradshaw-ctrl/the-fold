// vault-worker-client.js — the main-thread promise wrapper around
// vault-worker.mjs, one Worker shared across every call (spawning one per
// call would reopen the vault directory every time for nothing). Every
// function here does no cryptography — vault.js does that, on the main
// thread, before a sealed blob ever reaches this file.

let worker = null;
let nextId = 1;
const pending = new Map();

function ensureWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./vault-worker.mjs", import.meta.url), { type: "module" });
  worker.onmessage = (ev) => {
    const { id, ok, value, error } = ev.data ?? {};
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    ok ? p.resolve(value) : p.reject(new Error(error));
  };
  return worker;
}

function call(type, extra = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ensureWorker().postMessage({ id, type, ...extra });
  });
}

export const vaultExists = () => call("exists");
export const readVaultBytes = () => call("read");
export const writeVaultBytes = (bytes) => call("write", { bytes });
export const deleteVault = () => call("delete");
export const resetVault = () => call("reset");
export const readPendingQueue = () => call("readQueue");
export const writePendingQueue = (queue) => call("writeQueue", { queue });
export const readAutoKey = () => call("readAutoKey");
export const writeAutoKey = (bytes) => call("writeAutoKey", { bytes });
export const deleteAutoKey = () => call("deleteAutoKey");
