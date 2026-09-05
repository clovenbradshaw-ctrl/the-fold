// routes.js — where the page is, what it can reach from there, said once at boot.
//
// The page has three homes (deploy/build-site.mjs): a terminal (`./fold`,
// serve.mjs and explore-server.mjs on localhost), GitHub Pages (a static
// origin), and a browser extension (a chrome-extension:// origin). What is
// reachable differs by home AND by moment — Ollama may or may not be
// listening, an explore server may be running beside a static page, WebGPU
// may be absent — so the page PROBES its routes at boot and reports what
// answered, in one line by the composer and in full at `/routes`. A route is
// never assumed from the home: a Pages visitor who also runs `./fold` gets
// their local record and web organ; a terminal user without Ollama gets the
// in-tab rung. Every probe is a localhost call or a same-origin call; the
// weights probe (webllm-rung.js weightsBases) is the one that may reach a
// mirror or the publisher, and only on the first in-tab load.
//
// PURE: the probes are injected results; this file decides and phrases.

/** The home, read off the page's own address — never a flag. */
export function whereAmI(href) {
  let u;
  try { u = new URL(href); } catch { return { home: "unknown", origin: null, local: false, extension: false }; }
  const local = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(u.hostname);
  const extension = /^(chrome|moz|safari-web)-extension:$/.test(u.protocol);
  return { home: extension ? "extension" : local ? "terminal" : "site", origin: u.origin, local, extension, subpath: u.pathname.replace(/\/[^/]*$/, "/") };
}

/**
 * The report. `probes` is what the boot actually found:
 *   ollama:  { ok, models }            | { ok: false, detail }
 *   webgpu:  null (available)          | "<blocker text>"
 *   explore: { ok, base }              | { ok: false, base, detail }
 *   api:     { ok, base }              | { ok: false, base, detail }   (serve.mjs's /api, same origin)
 *   weights: { route, base }           | null (no in-tab load yet)
 * Returns {summary, lines, gaps}: `summary` is the one boot line, `lines`
 * the /routes table, `gaps` the doors that will answer with a typed gap.
 */
export function describeRoutes({ where, probes = {} } = {}) {
  const w = where ?? { home: "unknown" };
  const p = probes;
  const lines = [];
  const gaps = [];
  lines.push(`home: ${w.home}${w.origin ? ` (${w.origin}${w.subpath && w.subpath !== "/" ? w.subpath : ""})` : ""}`);
  // the mouth
  const mouths = [];
  if (p.ollama?.ok) mouths.push(`Ollama on localhost:11434 (${p.ollama.models ?? 0} model(s))`);
  else lines.push(`Ollama: not reachable${p.ollama?.detail ? ` — ${p.ollama.detail}` : ""}`);
  if (p.webgpu == null) mouths.push("the in-tab rung on WebGPU");
  else lines.push(`in-tab rung: unavailable — ${p.webgpu}`);
  lines.splice(1, 0, `mouth: ${mouths.length ? mouths.join(" · ") : "NONE — no Ollama and no WebGPU; nothing here can answer"}`);
  if (p.weights) lines.push(`weights: ${p.weights.route}${p.weights.base ? ` (${p.weights.base})` : ""}`);
  // the local servers
  if (p.explore?.ok) lines.push(`record, web, priors, GitHub: explore-server at ${p.explore.base}`);
  else { lines.push(`explore-server at ${p.explore?.base ?? "localhost:8812"}: not reachable — the Reading pane, /reopen, the web toggle, /priors, /gateways, /ranke and GitHub answer with a typed gap${p.explore?.detail ? ` (${p.explore.detail})` : ""}`); gaps.push("explore-server"); }
  if (p.api?.ok) lines.push(`/run and /transcribe from a URL: serve.mjs at ${p.api.base}`);
  else { lines.push(`serve.mjs /api: not reachable — /run and URL transcription answer with a typed gap; the in-page sandbox terminal and file transcription still work`); gaps.push("serve-api"); }
  const mouth = mouths.length ? (mouths.length === 2 ? "Ollama + in-tab" : mouths[0].startsWith("Ollama") ? "Ollama" : "in-tab") : "no mouth";
  const summary = `${w.home} · ${mouth}${p.explore?.ok ? " · record & web on" : " · record & web off"}${p.api?.ok ? "" : w.home === "terminal" ? " · /run off" : ""}`;
  return { summary, lines, gaps };
}
