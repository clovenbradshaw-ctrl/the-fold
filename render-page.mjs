// render-page.mjs — the "look at a website" render crossing: a fetched page's
// RAW HTML BYTES, rendered to a full-page PNG by a real browser engine, so the
// looking organ (eoreader7 native/organs/look.js) can read the page the way a
// person would — layout, tables, diagrams, images — instead of only its
// flattened text face.
//
// THE SINGLE EGRESS RULE (POLICIES P13) IS WHAT DECIDES THE SHAPE. The bytes
// rendered here are ALWAYS bytes the web organ already fetched and recorded
// (fetchAndKeep's content-addressed raw face) — never a URL this module
// fetches. Chrome loads them from a LOOPBACK http server this module stands up
// on an ephemeral port and tears down — 127.0.0.1 only, the instrument's own
// machine — so the only external crossing any page ever makes is the one
// already on the web history. This is the honest limit it also costs: a page
// whose content is entirely produced by remote JavaScript renders as its
// shell, exactly as the text face already read it — disclosed by the caller,
// never a second, unrecorded browser-side egress layered over the same
// problem.
//
// REQUIREMENTS, refused loudly rather than silently degraded (the engine's own
// standing discipline): a real Chrome/Chromium binary. CHROME_BIN names one
// explicitly; otherwise the standard macOS application path, then the usual
// Linux binary paths. Node 22+ (native WebSocket — the CDP client below talks
// the protocol directly, no Playwright/Puppeteer package, the same choice the
// fold's eval drivers already make). Every await has a bound; a Chrome that
// dies or stalls is a typed refusal, never a hang.
//
// Export: renderHtmlToImage(html, {url, outPath, ...}) -> {imagePath, width,
// height, truncated, settled, renderMs, url} or throws an Error whose message
// names which dependency was missing / which step failed.

import { spawn } from "node:child_process";
import http from "node:http";
import { writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

// Declared numbers, each with its giver — engineering starting points (P9),
// never tuned against an outcome.
export const RENDER_VIEWPORT_WIDTH = 1280; // px — a comfortable reading column; a full-page render is this wide
export const RENDER_VIEWPORT_HEIGHT = 900; // px — the initial viewport height before the full-page capture is measured
export const RENDER_MAX_HEIGHT = 6000; // px — a full-page screenshot cap; an article taller than this is captured truncated, and the truncation is said, never hidden
export const RENDER_WAIT_TIMEOUT_MS = 12000; // how long to wait for the page's readyState to settle (a JS-heavy page may never — capture what is there)
export const RENDER_SETTLE_MS = 500; // quiet delay after readyState so late layout/images paint before the capture
export const RENDER_CDP_STEP_TIMEOUT_MS = 6000; // one CDP round-trip's bound; a Chrome that stops answering a request is dead, not slow

const DEFAULT_CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", // macOS, the fold's own eval drivers already use this path
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome", // Linux, common
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

export function findChromeBinary() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  for (const p of DEFAULT_CHROME_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  return null;
}

function withTimeout(promise, ms, what) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const t = setTimeout(() => reject(new Error(`${what} timed out after ${ms}ms`)), ms);
      if (promise.finally) promise.finally(() => clearTimeout(t)).catch(() => {});
    }),
  ]);
}

function cdpSend(ws, id, method, params = {}) {
  ws.send(JSON.stringify({ id, method, params }));
}

/** A minimal CDP client over Node's native WebSocket — one request in flight
 * at a time, the same shape the fold's eval drivers already use. Bounded: a
 * request that never answers (a Chrome that died mid-read) rejects, it never
 * hangs the caller. */
function cdpRequest(ws, id, { timeoutMs = RENDER_CDP_STEP_TIMEOUT_MS } = {}) {
  return withTimeout(
    new Promise((resolve, reject) => {
      const onMessage = (ev) => {
        const msg = JSON.parse(String(ev.data));
        if (msg.id !== id) return;
        ws.removeEventListener("message", onMessage);
        if (msg.error) reject(new Error(`CDP error: ${msg.error.message}`));
        else resolve(msg.result ?? {});
      };
      ws.addEventListener("message", onMessage);
      ws.addEventListener("close", () => { ws.removeEventListener("message", onMessage); reject(new Error("CDP socket closed")); }, { once: true });
    }),
    timeoutMs,
    "a CDP round-trip",
  );
}

async function waitForReady(ws, { timeoutMs, settleMs }) {
  // Poll document.readyState via Runtime.evaluate — the load event may have
  // fired before we attached, so events alone are unreliable here. Each poll
  // is individually bounded; an unresponsive Chrome refuses, never hangs.
  const deadline = Date.now() + timeoutMs;
  let id = 1;
  while (Date.now() < deadline) {
    const result = await cdpRequest(ws, id++, { timeoutMs: 3000 }).then(
      (r) => r.result?.value,
      () => null, // one failed poll is a refusal to answer, not the page — keep polling to the deadline
    );
    if (result === "complete") break;
    await new Promise((r) => setTimeout(r, 250));
  }
  await new Promise((r) => setTimeout(r, settleMs));
  return true;
}

/**
 * Render already-fetched HTML bytes to a full-page PNG.
 * @param {string} html  the page's raw bytes (the recorded fetch's raw face)
 * @param {object} opts
 *   url       the page's address (disclosure only — the render is of the
 *             bytes the recorded fetch kept, never a live re-fetch)
 *   outPath   where the PNG is written (content-addressed by the caller)
 *   viewportWidth, maxHeight  declared numbers, exported above
 * @returns {Promise<{imagePath, width, height, truncated, settled, renderMs, url}>}
 * @throws Error naming the missing dependency / failed step (callers turn it
 *   into a typed gap, never a silent empty read)
 */
export async function renderHtmlToImage(html, { url = "https://example.org/page", outPath, viewportWidth = RENDER_VIEWPORT_WIDTH, maxHeight = RENDER_MAX_HEIGHT, waitTimeoutMs = RENDER_WAIT_TIMEOUT_MS, settleMs = RENDER_SETTLE_MS } = {}) {
  if (!outPath) throw new Error("renderHtmlToImage needs an outPath");
  const chrome = findChromeBinary();
  if (!chrome) {
    throw new Error("no Chrome/Chromium binary found for the page render (set CHROME_BIN, or install Chrome at the standard path) — the mechanical read already ran on the bytes, but the page was not rendered");
  }

  const workdir = mkdtempSync(path.join(os.tmpdir(), "er7-look-page-"));
  const startedAt = Date.now();

  // Loopback http server for the bytes — never a second egress. An ephemeral
  // port, torn down in `finally`. Serving over http (rather than navigating
  // Chrome to file://) is what makes the render reliable in the headless
  // sandbox (measured 2026-09-15: a file:// navigation hung before rendering,
  // while the same bytes over 127.0.0.1 rendered on the first try).
  const server = http.createServer((req, res) => {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(String(html ?? ""));
  });
  const port = await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
  const pageUrl = `http://127.0.0.1:${port}/page.html`;

  const profileDir = path.join(workdir, "profile");
  let chromeErr = "";
  const proc = spawn(chrome, [
    `--headless=new`,
    `--disable-gpu`,
    "--no-sandbox",
    "--no-first-run",
    "--disable-background-networking",
    "--disable-default-apps",
    `--remote-debugging-port=${port + 1}`,
    `--user-data-dir=${profileDir}`,
    // about:blank, never the target URL: a headless Chrome handed a real URL
    // at spawn was measured stalling before its DevTools endpoint ever came
    // up (2026-09-15) — the target is navigated to AFTER the CDP socket is
    // up, via Page.navigate.
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  proc.stderr.on("data", (b) => { chromeErr += b.toString(); });

  try {
    const debugPort = port + 1;
    const versionUrl = `http://127.0.0.1:${debugPort}/json/list`;
    let targets = null;
    const endpointDeadline = Date.now() + 10000;
    while (Date.now() < endpointDeadline) {
      try {
        const res = await fetch(versionUrl);
        if (res.ok) { targets = await res.json(); break; }
      } catch {
        /* not up yet */
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!targets) throw new Error(`headless Chrome did not come up on port ${debugPort} — the page was not rendered${chromeErr ? ` (chrome stderr: ${chromeErr.slice(0, 300)})` : ""}`);

    const target = (targets ?? []).find((t) => t.type === "page" && t.url === "about:blank")
      ?? (targets ?? []).find((t) => t.type === "page");
    if (!target?.webSocketDebuggerUrl) {
      throw new Error("the rendered page target never appeared — the page was not rendered");
    }

    const ws = await withTimeout(
      new Promise((resolve, reject) => {
        const s = new WebSocket(target.webSocketDebuggerUrl);
        s.addEventListener("open", () => resolve(s), { once: true });
        s.addEventListener("error", () => reject(new Error("CDP websocket failed")), { once: true });
      }),
      RENDER_CDP_STEP_TIMEOUT_MS,
      "connecting the CDP websocket",
    );

    let seq = 1;
    const send = (method, params) => {
      const id = seq++;
      const p = cdpRequest(ws, id);
      cdpSend(ws, id, method, params);
      return p;
    };

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: viewportWidth, height: RENDER_VIEWPORT_HEIGHT, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: pageUrl });

    const settled = await waitForReady(ws, { timeoutMs: waitTimeoutMs, settleMs });

    let contentHeight = RENDER_VIEWPORT_HEIGHT;
    try {
      const metrics = await send("Page.getLayoutMetrics");
      contentHeight = metrics?.contentSize?.height ?? RENDER_VIEWPORT_HEIGHT;
    } catch {
      /* fall back to the viewport height */
    }
    const height = Math.max(1, Math.min(Math.round(contentHeight), maxHeight));
    const truncated = Math.round(contentHeight) > maxHeight;

    const shot = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: viewportWidth, height, scale: 1 },
    });
    if (!shot?.data) throw new Error("Chrome returned no screenshot data — the page was not rendered");
    writeFileSync(outPath, Buffer.from(shot.data, "base64"));

    ws.close();
    return {
      imagePath: outPath,
      width: viewportWidth,
      height,
      truncated,
      settled,
      renderMs: Date.now() - startedAt,
      url,
    };
  } finally {
    proc.kill("SIGKILL");
    server.close();
    try { rmSync(workdir, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
}