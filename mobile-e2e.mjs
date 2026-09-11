// mobile-e2e.mjs — open The Fold in a real mobile viewport and drive it
// end to end, screenshotting every surface so a person can SEE what a phone
// shows (2026-09-11). Run after `node serve.mjs 8899`:
//   node mobile-e2e.mjs [--out dir]
// Chrome device metrics emulate an iPhone-ish 390×844 viewport at 3x.
// Screenshots land in out/ (boot, chat, model menu, composer, a turn, tabs).
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = process.argv.find((a) => a === "--out") ? process.argv[process.argv.indexOf("--out") + 1] : "eval/mobile-shots";
mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9355);
const PAGE = process.env.PAGE ?? "http://localhost:8899/";
const chrome = spawn(CHROME, [
  "--headless=new", "--no-sandbox", "--disable-gpu",
  `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=/tmp/tf-mobile-${Date.now()}`,
  "--window-size=390,844", PAGE,
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws = null;
const shots = [];
try {
  let targets = null;
  for (let i = 0; i < 160; i++) { try { targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)).json(); if (targets.length) break; } catch { /* not up */ } await sleep(250); }
  if (!targets?.length) throw new Error("debugger never came up");
  const page = targets.find((t) => t.type === "page" && t.url.startsWith(PAGE));
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let nextId = 1; const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise((res) => { const id = nextId++; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });

  await send("Runtime.enable");
  await send("Page.enable");
  const consoleMsgs = [];
  await send("Runtime.consoleAPICalled", {}); // subscribe no-op; we read via evaluation

  // iPhone-ish metrics: 390×844 CSS px, 3x density, mobile (touch, narrow)
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true, screenWidth: 390, screenHeight: 844 });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true });

  const shot = async (name) => {
    await sleep(700);
    const r = await send("Page.captureScreenshot", { format: "png" });
    const file = `${OUT}/${name}.png`;
    writeFileSync(file, Buffer.from(r.result.data, "base64"));
    shots.push(name);
    console.log(`  📷 ${file}`);
  };
  const evalv = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.result?.value;
  const waitFor = async (expr, what, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evalv(expr)) return true; await sleep(400); } throw new Error(`timeout waiting for ${what}`); };

  console.log("waiting for the page to become ready…");
  await waitFor("document.getElementById('send') && !document.getElementById('send').disabled", "send enabled", 40000);

  await shot("01-boot");

  // the model chip on the composer — its size/readability
  const chip = await evalv("(() => { const el=document.getElementById('model-name'); return el ? { text: el.textContent, w: el.offsetWidth, h: el.offsetHeight, font: getComputedStyle(el).fontSize } : null; })()");
  console.log("model chip:", JSON.stringify(chip));

  // open the model menu
  await evalv("document.getElementById('model-pick').click(); true");
  await shot("02-model-menu");
  await evalv("document.querySelector('#model-menu .sheet-close')?.click(); true");

  // open the bottom tabs / a panel
  await evalv("(() => { const t=[...document.querySelectorAll('.tabs button')]; if(t.length) t[1]?.click(); return true; })(); true");
  await shot("03-tabs");

  // send a real message (gemma2:2b, the default)
  await evalv("(() => { const i=document.getElementById('input'); i.value='Hi, what river is Nashville on?'; i.dispatchEvent(new Event('input',{bubbles:true})); return true; })(); true");
  await sleep(300);
  await evalv("document.getElementById('send').click(); true");
  await shot("04-turn-start");
  await waitFor("document.querySelectorAll('.msg .body').length >= 2", "an answer rendered", 90000);
  await shot("05-turn-done");

  console.log("console so far:");
  console.log((await evalv("localStorage.getItem('last-errors')")) ?? "(none captured)");
  console.log("done — screenshots in", OUT);
  process.exit(0);
} finally {
  try { ws?.close(); } catch { /* best effort */ }
  chrome.kill("SIGKILL");
}