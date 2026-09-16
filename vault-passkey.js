// vault-passkey.js — the crossing for the vault's THIRD key source: a
// passkey (WebAuthn), touching navigator.credentials the same way
// vault-client.js touches navigator.storage and matrix-client.js touches
// fetch. Nothing here decides WHAT gets sealed — vault.js does that, with
// whatever 32 raw bytes this file hands it, exactly as it already accepts a
// passphrase-derived key or a Matrix-unwrapped one.
//
// The mechanism: WebAuthn's PRF extension asks the authenticator to
// evaluate a pseudo-random function over a fixed input (VAULT_PASSKEY_PRF_INFO,
// vault.js) and return the output — deterministic per (authenticator,
// credential, salt), so the SAME passkey always derives the SAME 32 bytes,
// with no passphrase to remember or re-type. This is the same primitive
// password managers use for passkey-derived encryption; it is NOT universal
// — PRF support varies by platform/browser and cannot be assumed. Every
// function here checks and reports support rather than assuming it.
//
// Disclosed rather than claimed: this file's PRF path has not been
// exercised against a real hardware authenticator in this pass — only
// feature-detected and syntax-checked. A live device is needed to confirm
// the full register→derive→unlock round trip; say so wherever this is
// surfaced until that's done.

import { VAULT_PASSKEY_PRF_INFO } from "./vault.js";

const RP_NAME = "the-fold local vault";
const CREDENTIAL_ID_KEY = "fold-vault-passkey-id";

/** Whether this browser can even attempt a passkey at all — checked before
 * offering the option, never assumed from a browser/OS guess. */
export function passkeySupported() {
  return typeof PublicKeyCredential !== "undefined" && typeof navigator?.credentials?.create === "function";
}

function b64url(bytes) {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(s) {
  const t = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(t + "=".repeat((4 - (t.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const storedPasskeyId = () => localStorage.getItem(CREDENTIAL_ID_KEY);
export const clearStoredPasskeyId = () => localStorage.removeItem(CREDENTIAL_ID_KEY);

/** Register a new passkey for this vault and derive its first key. Returns
 * { key, credentialId } — the caller (app.js) persists credentialId (not a
 * secret; it only names WHICH passkey, never opens anything by itself) and
 * seals a vault blob with `key` exactly as sealVaultBlob already does for a
 * passphrase-derived one. Throws if the platform refuses PRF, a real and
 * disclosed limit rather than a silent fallback to something weaker. */
export async function registerPasskeyKey() {
  if (!passkeySupported()) throw new Error("this browser has no passkey support");
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const cred = await navigator.credentials.create({
    publicKey: {
      rp: { name: RP_NAME },
      user: { id: userId, name: "fold-vault", displayName: "The Fold vault" },
      challenge,
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { userVerification: "preferred", residentKey: "preferred" },
      extensions: { prf: {} },
    },
  });
  if (!cred) throw new Error("passkey creation was cancelled");
  if (!cred.getClientExtensionResults?.().prf?.enabled) throw new Error("this authenticator doesn't support the PRF extension — a passphrase or Matrix login is needed instead");
  const credentialId = b64url(cred.rawId);
  const key = await evalPrf(credentialId, challenge);
  localStorage.setItem(CREDENTIAL_ID_KEY, credentialId);
  return { key, credentialId };
}

/** Re-derive the SAME key from an already-registered passkey — the "unlock"
 * side. `credentialId` is whatever registerPasskeyKey returned/stored. */
export async function unlockWithPasskey(credentialId = storedPasskeyId()) {
  if (!credentialId) throw new Error("no passkey is registered for this vault");
  if (!passkeySupported()) throw new Error("this browser has no passkey support");
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const key = await evalPrf(credentialId, challenge);
  return { key };
}

async function evalPrf(credentialId, challenge) {
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ type: "public-key", id: unb64url(credentialId) }],
      userVerification: "preferred",
      extensions: { prf: { eval: { first: VAULT_PASSKEY_PRF_INFO } } },
    },
  });
  if (!assertion) throw new Error("passkey use was cancelled");
  const results = assertion.getClientExtensionResults?.().prf?.results;
  if (!results?.first) throw new Error("this authenticator returned no PRF output — the vault key could not be derived");
  const bytes = new Uint8Array(results.first);
  if (bytes.length !== 32) throw new Error(`PRF returned ${bytes.length} bytes, not the 32 a vault key needs`);
  return bytes;
}
