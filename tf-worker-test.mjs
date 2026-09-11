// tf-worker-test.mjs — prove the on-device CPU rung actually downloads and
// loads the model from its publisher, in a REAL browser (headless over CDP,
// Node 22's native WebSocket). Run:
//   node serve.mjs 8899          (the fold's own server — correct MIME types)
//   node tf-worker-test.mjs      (points at http://localhost:8899/tf-worker-test.html)
// The browser's own cache is separate from Node's, so this downloads the
// weights fresh, exactly as a phone would. It polls the page until the
// client reports loaded or an error, then prints the transcript.
// CHROME_BIN overrides the browser (e.g. the Brave binary — the same
// Chromium engine as Android Brave).
//
// BRAVE LESSON (measured 2026-09-11): Brave's own Shields — its built-in
// ad/tracker blocking — drops a long CDN download in a headless run: the
// model fetch stalled at ~48s on every attempt (reaching 32%, then 63%)
// until the run launched with `--disable-features=BraveShields`, after
// which the full ~790 MB downloaded and loaded in 84s. This is WHY the
// harness carries that flag. On a real phone the network path itself is
// fine (a plain curl of the same file completed in 82s), so the lesson is
// about Brave's blockers on long downloads — and the client retries a
// dropped download regardless (tf-chat-client.js).
import { spawn } from "node:child_process";

const PORT = 8899;
const PAGE = `http://localhost:${PORT}/tf-worker-test.html`;
const CHROME = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9333);

const userData = "/tmp/tf-brave-cache"; // FIXED so a dropped download resumes from the browser cache

const chrome = spawn(CHROME, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-features=BraveShields",
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${userData}`,
  "--window-size=480,900",
  PAGE,
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

let ws = null;
try {
  // Wait for the debugger, then grab the page's websocket.
  let targets = null;
  for (let i = 0; i < 160; i++) {
    try { targets = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json`); if (targets.length) break; } catch { /* not up yet */ }
    await sleep(250);
  }
  if (!targets?.length) throw new Error("chrome debugger never came up");
  const page = targets.find((t) => t.type === "page" && t.url.includes("tf-worker-test"));
  if (!page) throw new Error(`test page not found among ${targets.map((t) => t.url).join(", ")}`);
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let nextId = 1;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  };
  const send = (method, params = {}) => new Promise((res) => { const id = nextId++; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });

  await send("Runtime.enable");
  const start = Date.now();
  const deadline = start + 6 * 60 * 1000; // 6 min for a fresh ~400MB download
  let title = "", out = "";
  while (Date.now() < deadline) {
    const r = await send("Runtime.evaluate", { expression: `JSON.stringify({ title: document.title, out: document.getElementById('out')?.textContent ?? '' })`, returnByValue: true });
    const v = r?.result?.result?.value;
    if (v) { try { ({ title, out } = JSON.parse(v)); } catch { /* not ready */ } }
    if (title === "TF-LOADED") break;
    if (title === "TF-ERROR") break;
    await sleep(2000);
  }
  console.log(out);
  const took = ((Date.now() - start) / 1000).toFixed(0);
  if (title === "TF-LOADED") {
    console.log(`\nPASS: the worker downloaded and loaded the model from its publisher in the browser (${took}s).`);
    process.exit(0);
  }
  if (title === "TF-ERROR") {
    console.log(`\nFAIL: the worker reported an error (${took}s).`);
    process.exit(1);
  }
  console.log(`\nFAIL: timed out after ${took}s — the worker never spoke (silent hang).`);
  process.exit(1);
} finally {
  try { ws?.close(); } catch { /* best effort */ }
  chrome.kill("SIGKILL");
}