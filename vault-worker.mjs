// vault-worker.mjs — the dedicated Worker vault-client.js's own header says a
// caller must proxy through: OPFS sync access handles only exist inside a
// Worker in most engines today. This file is that Worker — it does no
// cryptography of its own (vault.js, on the main thread, seals and opens
// every blob) and only ever moves bytes the main thread already produced.
//
// Message shape in: { id, type: "exists"|"read"|"write"|"delete"|"reset"
//   |"readQueue"|"writeQueue", bytes?, queue? }
// Message shape out: { id, ok: true, value? } | { id, ok: false, error }

import {
  vaultExists, readVaultBytes, writeVaultBytes, deleteVault, resetVault,
  readPendingQueue, writePendingQueue, readAutoKey, writeAutoKey, deleteAutoKey,
} from "./vault-client.js";

self.onmessage = async (ev) => {
  const { id, type, bytes, queue } = ev.data ?? {};
  try {
    let value;
    if (type === "exists") value = await vaultExists();
    else if (type === "read") value = await readVaultBytes();
    else if (type === "write") await writeVaultBytes(bytes);
    else if (type === "delete") await deleteVault();
    else if (type === "reset") await resetVault();
    else if (type === "readQueue") value = await readPendingQueue();
    else if (type === "writeQueue") await writePendingQueue(queue);
    else if (type === "readAutoKey") value = await readAutoKey();
    else if (type === "writeAutoKey") await writeAutoKey(bytes);
    else if (type === "deleteAutoKey") await deleteAutoKey();
    else throw new Error(`vault-worker: unknown message type "${type}"`);
    self.postMessage({ id, ok: true, value });
  } catch (e) {
    self.postMessage({ id, ok: false, error: e instanceof Error ? e.message : String(e) });
  }
};
