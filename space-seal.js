// space-seal.js — a space kept somewhere that is not private is kept SEALED.
//
// User direction 2026-09-08: "we need to be hyper specific about what is
// public vs private. and in fact, if we are doing a non private, encrypt it
// so even if it gets leaked is encrypted."
//
// That rule already has an implementation in this repo and it is not this
// file: matrix.js holds the sealing the room uses (AES-256-GCM under a
// per-space key, P119/P120), and it is imported here rather than restated.
// One sealing mechanism, two transports — a room and a repo — because a
// second copy of a cipher is how two copies drift into one that is wrong.
//
// THE RULE, stated once:
//
//   private repo  -> plaintext. Readable by you, whoever you invite, and
//                    GitHub. Diffable, greppable, reviewable — the reasons
//                    to use a repo at all.
//   anything else -> sealed. What GitHub stores is ciphertext; the key is
//                    never sent there. A leak of the repo is a leak of
//                    bytes nobody can read.
//
// The key travels the way the room's own share links carry theirs: in a URL
// FRAGMENT, which browsers do not send to servers. Handing someone the link
// is handing them the space; publishing the repo without the link publishes
// nothing legible. That is what makes a public space shareable-on-purpose
// rather than merely exposed.

import { generateChatKey, seal, open, b64url, unb64url } from "./matrix.js";

/** A sealed artifact keeps its own name plus this, so a repo listing says
 * plainly which files are readable and which are not. */
export const SEALED_SUFFIX = ".sealed";

export const isSealedPath = (p) => String(p ?? "").endsWith(SEALED_SUFFIX);
export const sealedPath = (p) => (isSealedPath(p) ? p : `${p}${SEALED_SUFFIX}`);
export const plainPath = (p) => (isSealedPath(p) ? p.slice(0, -SEALED_SUFFIX.length) : p);

/** A new space key, in the URL-safe form a share link carries. */
export function newSpaceKey() {
  return b64url(generateChatKey());
}

const keyBytes = (k) => unb64url(String(k));

/**
 * One file, sealed for storage. The envelope is JSON so a repo browser shows
 * something self-describing rather than a wall of base64 with no story: what
 * it is, what sealed it, and the fact that the key is not here.
 */
export async function sealFile(key, { path, content }) {
  const env = await seal(keyBytes(key), { path, content });
  return {
    path: sealedPath(path),
    content: `${JSON.stringify({
      fold: "sealed-space",
      v: 1,
      alg: "AES-256-GCM",
      note: "Encrypted by the fold. The key is not in this repository — it travels in the share link's fragment.",
      env,
    }, null, 2)}\n`,
  };
}

/** The reverse. Throws if the key is wrong — a wrong key is not a warning. */
export async function openFile(key, { path, content }) {
  const outer = JSON.parse(content);
  if (outer?.fold !== "sealed-space" || typeof outer.env !== "string") {
    throw new Error(`${path} is not a sealed space file`);
  }
  const inner = await open(keyBytes(key), outer.env);
  return { path: inner.path ?? plainPath(path), content: inner.content };
}

/**
 * The link that IS the space: the repo it names, and the key to open it,
 * after the '#' so it never reaches a server's logs. Anyone holding this can
 * read the space; that is the point, and it is also the whole risk, so
 * callers say so where they hand it over.
 */
export function spaceLink(base, fullName, key) {
  const url = new URL(base);
  url.hash = `space=${encodeURIComponent(fullName)}&k=${key}`;
  return url.toString();
}

/** The other end: a fragment back into {fullName, key}, or null. */
export function parseSpaceLink(hash) {
  const h = String(hash ?? "").replace(/^#/, "");
  if (!h) return null;
  const q = new URLSearchParams(h);
  const fullName = q.get("space");
  const key = q.get("k");
  if (!fullName || !key || !/^[\w.-]+\/[\w.-]+$/.test(fullName)) return null;
  return { fullName, key };
}

/**
 * The one decision this module exists to make, kept in a single place so no
 * caller re-derives it: does saving to this destination have to be sealed?
 * Anything not known to be private is sealed — an UNKNOWN visibility seals
 * too, because the failure that matters is publishing in the clear by
 * accident, never sealing something that did not need it.
 */
export function mustSeal(visibility) {
  return visibility !== "private";
}
