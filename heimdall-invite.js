// heimdall-invite.js — the page's one door onto the heimdall compute fleet
// (heimdall: distributed inference — a link, a 6-digit pairing code, any
// device lending its model). Mint a fleet room + invite link under the
// person's own Matrix account, and record the code a worker gives them out
// of band into the account's org.heimdall.codes registry — the SAME registry
// the heimdall site's host confirms acceptance against. So an invite minted
// here is confirmable on the heimdall site, and vice versa.
//
// PURE (the cast.js pattern): the only crossings — createRoom, and reading /
// writing account data — are injected, so the link is built, never fetched,
// and nothing here reaches a non-localhost host (II.13). The worker's device
// generates its own 6-digit pairing code and gives it to the person; this
// page records it. The code never rides in the link.
import { heimdallRoomBody } from "./matrix.js";

export const HEIMDALL_SITE = "https://clovenbradshaw-ctrl.github.io/heimdall/";
export const CODES_TYPE = "org.heimdall.codes";
export const INVITE_TTL_MS = 7 * 24 * 3600 * 1000;

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** The worker's pairing code is six digits; anything else is a typed refusal. */
export function normalizeCode(input) {
  const digits = String(input ?? "").replace(/\D/g, "").slice(0, 6);
  return digits.length === 6 ? digits : null;
}

export function inviteLink({ site = HEIMDALL_SITE, roomId, hs, host, name, exp }) {
  const params = new URLSearchParams({ room: roomId, hs, host, name: name || host, exp: String(exp) });
  return `${site}?${params.toString()}`;
}

/** Mint a fleet room under the caller's account and build the share link. */
export async function mintInvite({ http, hs, host, name }) {
  const roomId = await http.createRoom(`heimdall-${Math.random().toString(36).slice(2, 7)}`, { isPublic: true });
  const exp = Date.now() + INVITE_TTL_MS;
  return { roomId, exp, link: inviteLink({ roomId, hs, host, name: name || host, exp }) };
}

/** Record a worker's 6-digit code into the account registry: read-modify-write
 *  of {active:[{hash,exp}]}, pruning expired entries, never overwriting. */
export async function recordCode({ code, read, write }) {
  const digits = normalizeCode(code);
  if (!digits) return { ok: false, reason: "six digits" };
  const hash = await sha256Hex(digits);
  const now = Date.now();
  const existing = await read();
  const active = (existing?.active ?? []).filter((c) => c.exp > now);
  if (active.some((c) => c.hash === hash)) return { ok: true, duplicate: true, active };
  active.push({ hash, exp: now + INVITE_TTL_MS });
  await write({ active });
  return { ok: true, duplicate: false, active };
}

export { heimdallRoomBody };