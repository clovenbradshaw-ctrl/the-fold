// explore-bridge.js — the seam from a Converse ref to the Explore tab.
//
// A chat ref is `name#from-to` in CHAR offsets of the in-memory source
// (source.js::readRange slices the JS string). Explore opens files on disk
// by path. This module carries one to the other WITHOUT changing either
// coordinate space: the source text is deposited to the explore server
// (content-addressed, append-only in effect, recorded in the I.5 record)
// and the char range rides the URL as c0/c1 — Explore's own space for chat
// refs, kept apart by name from the engine's byte b0/b1.
//
// Pure except openInExplore's two effects (one POST, one window.open); the
// parsing half is importable by tests and by app.js's reopen modal for the
// in-context view.

// The explore server's own default port (explore-server.mjs). Declared here
// because the Converse page may be served by a different static server; a
// non-default setup passes exploreBase explicitly.
// Overridable per page-load (?explore=http://localhost:8819) because this
// working directory's own documented reality is several concurrent sessions
// each running their own server — a page must be able to name which explore
// host it means without editing shared source. Localhost only either way;
// the constitution's host scan governs what this file may name.
const exploreOverride =
  typeof location !== "undefined" ? new URLSearchParams(location.search).get("explore") : null;
export const EXPLORE_BASE =
  exploreOverride && /^http:\/\/localhost:\d+$/.test(exploreOverride) ? exploreOverride : "http://localhost:8812";

/** `name#from-to` → { name, from, to } (char offsets), or null. Same regex readRange trusts. */
export function parseRef(ref) {
  const m = String(ref ?? "").match(/^(.*)#(\d+)-(\d+)$/);
  return m ? { name: m[1], from: Number(m[2]), to: Number(m[3]) } : null;
}

/**
 * The ref in context: the WHOLE source with the cited range located in it —
 * what a reopen modal renders as before/mark/after, so the bytes are seen
 * inside the thing they came from rather than floating alone.
 */
export function refContext(sources, ref) {
  const parsed = parseRef(ref);
  if (!parsed) return null;
  const text = sources[parsed.name];
  if (typeof text !== "string") return null;
  const from = Math.max(0, Math.min(parsed.from, text.length));
  const to = Math.max(from, Math.min(parsed.to, text.length));
  return { name: parsed.name, text, from, to, before: text.slice(0, from), cited: text.slice(from, to), after: text.slice(to) };
}

/**
 * Deposit the source with the explore server and open Explore focused on the
 * cited range. Returns the deposited path. The deposit is content-addressed:
 * re-opening the same source deposits nothing new.
 */
export async function openInExplore(sources, ref, { exploreBase = EXPLORE_BASE, open = (url) => window.open(url, "fold-explore") } = {}) {
  const ctx = refContext(sources, ref);
  if (!ctx) throw new Error(`unresolvable ref: ${ref}`);
  const res = await fetch(`${exploreBase}/api/deposit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: ctx.name, text: ctx.text }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `deposit failed (${res.status})`);
  const url = `${exploreBase}/explore.html?src=${encodeURIComponent(body.path)}&c0=${ctx.from}&c1=${ctx.to}`;
  open(url);
  return body.path;
}
