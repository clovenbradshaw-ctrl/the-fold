// eval/mobile-e2e.mjs — the mobile e2e for the 2026-09-13 pass, in BOTH
// real browser engines (Chromium and WebKit, Playwright's mobile viewports).
//
//   node eval/mobile-e2e.mjs            # boots its own servers, runs both engines
//   PLAYWRIGHT_NODE=... node eval/mobile-e2e.mjs   # playwright install path
//
// What it exercises, against real servers on localhost:
//   1. the page boots on phone-sized viewports in BOTH engines, the mobile
//      layout is live (tab bar, chatbot composer), no console errors, and the
//      in-tab model offer is honest for a GPU-less device: the CPU rung is
//      offered, no WebGPU rung that would fail on load;
//   2. the "between uses" Matrix story end to end through the REAL page and
//      the real matrix-client code: device A (Chromium) signs in and preserves
//      a room; device B (WebKit) signs in as the SAME account, is granted the
//      key automatically (same account, one chat), reads the history, and
//      preserves a turn that arrives on A's open page LIVE through
//      watchHistory — the connection carries a chat forward between uses
//      without a reload;
//   3. matrix-client.js's watchHistory sibling-delivery runs end to end in
//      BOTH engines at the module level (WebKit as the receiver too);
//   4. the page's heimdall watcher posts its engine/Matrix vitals to
//      serve.mjs's /api/vitals, and the /heimdall and /health surfaces that
//      eoreader7's Heimdall watches answer.
//
// Exit code is 0 only when every check passes.

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import net from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const PLAYWRIGHT_NODE = process.env.PLAYWRIGHT_NODE ?? "/tmp/pw152/node_modules/playwright/index.mjs";
const OUT_DIR = process.env.MOBILE_E2E_OUT ?? join(HERE, "mobile-shots");
mkdirSync(OUT_DIR, { recursive: true });

let CHAT_PORT = Number(process.env.MOBILE_E2E_CHAT ?? 0);
let EXPLORE_PORT = Number(process.env.MOBILE_E2E_EXPLORE ?? 0);
let HS_PORT = Number(process.env.MOBILE_E2E_HS ?? 0);
let PAGE = "";
const MOBILE = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 };

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((resolve) => {
  const s = net.createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); });
});
const waitFor = async (fn, { timeout = 30_000, step = 250, label = "condition" } = {}) => {
  const start = Date.now();
  let last;
  let lastErr = null;
  while (Date.now() - start < timeout) {
    try { last = await fn(); if (last) return last; } catch (e) { lastErr = e?.message ?? String(e); }
    await wait(step);
  }
  throw new Error(`timed out waiting for ${label} (last: ${JSON.stringify(last)}${lastErr ? ` · last error: ${lastErr}` : ""})`);
};

// ── servers ─────────────────────────────────────────────────────────────────
const procs = [];
function boot(cmd, args, env = {}) {
  const p = spawn(cmd, args, { cwd: ROOT, env: { ...process.env, THE_FOLD_NO_OPEN: "1", ...env }, stdio: ["ignore", "pipe", "pipe"] });
  p.out = "";
  p.stdout.on("data", (d) => { p.out += d; });
  p.stderr.on("data", (d) => { p.out += d; });
  procs.push(p);
  return p;
}
async function shutdown() {
  for (const p of procs.reverse()) { try { p.kill("SIGTERM"); } catch { /* gone */ } }
  await wait(400);
}
// Ports are resolved BEFORE the servers boot — freePort is racing a bind if
// it runs after. A fixed env port wins; otherwise each server picks a free one.
const [c, e, h] = await Promise.all([
  CHAT_PORT ? Promise.resolve(CHAT_PORT) : freePort(),
  EXPLORE_PORT ? Promise.resolve(EXPLORE_PORT) : freePort(),
  HS_PORT ? Promise.resolve(HS_PORT) : freePort(),
]);
CHAT_PORT = c; EXPLORE_PORT = e; HS_PORT = h;
PAGE = `http://localhost:${CHAT_PORT}/?noconnect`;

const hs = boot(process.execPath, ["matrix-fake-homeserver.mjs", String(HS_PORT)]);
const serve = boot(process.execPath, ["serve.mjs", String(CHAT_PORT)]);
const explore = boot(process.execPath, ["explore-server.mjs", String(EXPLORE_PORT)]);

const PW = {};
let HS_BASE;
let failures = 0;
const fail = (msg) => { failures++; console.error(`  ✖ ${msg}`); };
const pass = (msg) => console.log(`  ✔ ${msg}`);

try {
  await waitFor(() => /fake homeserver at/.test(hs.out) && /alice \//.test(hs.out), { timeout: 20_000, label: "fake homeserver up" });
  const users = /users (.*) — /.exec(hs.out)[1].split(/\s{2,}/);
  for (const u of users) {
    const parts = u.replace(/·/g, "").trim().split(" / ");
    if (parts.length === 2 && parts[0] && parts[1]) PW[parts[0].trim()] = parts[1].trim();
  }
  HS_BASE = /fake homeserver at (http:\/\/localhost:\d+)/.exec(hs.out)[1];
  console.log(`homeserver ${HS_BASE} · users ${Object.keys(PW).join(", ")}`);
  await waitFor(async () => { const r = await fetch(`http://localhost:${CHAT_PORT}/health`).catch((e) => { throw new Error(`health fetch: ${e.message}`); }); return r.ok; }, { timeout: 20_000, label: "chat server up" });
  await waitFor(async () => { const r = await fetch(`http://localhost:${EXPLORE_PORT}/api/library`); return [200, 404, 401].includes(r.status); }, { timeout: 20_000, label: "explore server up" });
} catch (e) {
  console.error(`BOOT FAILED: ${e.message}\n--- server output ---\n${hs.out}\n${serve.out}`);
  await shutdown(); process.exit(1);
}

const { chromium, webkit } = await import(PLAYWRIGHT_NODE);
const chromiumUA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const webkitUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

/** Boot a mobile page and check the shell: mobile layout, honest roster,
 * no console errors. Returns the page with errors collected. */
async function bootMobile(browser, name, ua) {
  const ctx = await browser.newContext({ ...MOBILE, userAgent: ua });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !/Failed to fetch|net::ERR|huggingface|tf-download|load failed|failed to load resource|noconnect|interactive-widget/i.test(msg.text())) errors.push(msg.text());
  });
  await page.goto(PAGE, { waitUntil: "domcontentloaded" });
  await waitFor(() => page.locator("#send").isEnabled().catch(() => false), { timeout: 20_000, label: `${name}: composer enabled` });
  await waitFor(() => page.evaluate(() => !document.querySelector("#not-served")), { timeout: 5000, label: `${name}: served` });
  const layout = await page.evaluate(() => ({
    tabs: !!document.querySelector("nav.tabs"), composer: !!document.querySelector("#composer"),
    input: !!document.querySelector("#input"), send: !!document.querySelector("#send"), notServed: !!document.querySelector("#not-served"),
  }));
  if (!layout.tabs || !layout.composer || !layout.input || !layout.send) throw new Error(`${name}: mobile shell incomplete ${JSON.stringify(layout)}`);
  if (layout.notServed) throw new Error(`${name}: #not-served showing — the page was not served`);
  const rosterInfo = await page.evaluate(async () => {
    const { offerableRungs } = await import("/webllm-rung.js");
    const { prebuiltAppConfig } = await import("/node_modules/@mlc-ai/web-llm/lib/index.js");
    let adapter = null;
    if (navigator.gpu) {
      const a = await navigator.gpu.requestAdapter().catch(() => null);
      if (a) adapter = { features: new Set(a.features), maxStorageBufferBindingSize: a.limits?.maxStorageBufferBindingSize ?? null };
    }
    const canRun = offerableRungs(prebuiltAppConfig, adapter, { memGB: navigator.deviceMemory ?? null });
    return { canRun, hasGpu: !!navigator.gpu, adapter: !!adapter, features: adapter ? [...adapter.features].filter((f) => f.includes("shader")).sort() : null };
  });
  const offered = await page.evaluate(() => [...document.querySelector("#model").options].map((o) => o.value));
  // the invariant that keeps a phone from loading a model that dies: every
  // in-tab rung the picker offers is one this device can actually run, judged
  // by the SAME offerableRungs the page's own fillModels uses.
  const webllmOffered = offered.filter((id) => /-MLC$/.test(id));
  const inOfferable = webllmOffered.filter((id) => rosterInfo.canRun.includes(id));
  if (inOfferable.length !== webllmOffered.length) {
    throw new Error(`${name}: the picker offers rungs the device cannot run: ${webllmOffered.filter((id) => !rosterInfo.canRun.includes(id)).join("; ")}`);
  }
  if (!offered.some((id) => id.startsWith("onnx-community/"))) throw new Error(`${name}: the CPU rung is not offered on a GPU-less phone`);
  const roster = await page.evaluate(() => [...document.querySelector("#model").options].map((o) => o.textContent));
  console.error(`    ${name} roster: GPU=${rosterInfo.hasGpu} adapter=${rosterInfo.adapter} shader-features=${JSON.stringify(rosterInfo.features)} → in-tab: ${webllmOffered.join(", ") || "(none — no WebGPU adapter)"} · CPU rung: yes`);
  await page.screenshot({ path: join(OUT_DIR, `${name}-boot.png`) });
  return { ctx, page, errors };
}

/** Sign in through the real sheet, then run a typed door; returns nothing. */
async function signIn(page, name) {
  await page.fill("#input", "/matrix login");
  await page.press("#input", "Enter");
  await waitFor(() => page.locator("#matrix-login").isVisible().catch(() => false), { timeout: 10_000, label: `${name}: login sheet opens` });
  await page.fill("#mx-hs", HS_BASE);
  await page.fill("#mx-user", "alice");
  await page.fill("#mx-pass", PW.alice);
  await page.click("#matrix-login-submit");
  await waitFor(() => page.evaluate(() => /signed in as/.test(document.querySelector("#chat")?.textContent ?? "")), { timeout: 20_000, label: `${name}: signed in` });
}
const chatText = (page) => page.evaluate(() => document.querySelector("#chat")?.textContent ?? "");
async function door(page, line, name) {
  await page.fill("#input", line);
  await page.press("#input", "Enter");
}

try {
  const b = await chromium.launch();
  const w = await webkit.launch();
  console.log("Chromium (Pixel 8) ← giver & receiver · WebKit (iPhone) ← the account's other device");

  // ── A: Chromium — boot, layout, honest roster, sign in, preserve, watch ──
  let A;
  try { A = await bootMobile(b, "chromium", chromiumUA); pass("Chromium boots on a phone viewport: mobile shell live, CPU rung offered, every in-tab rung one this device can run, no console errors"); }
  catch (e) { fail(`Chromium boot: ${e.message}`); await b.close(); await w.close(); await shutdown(); process.exit(1); }

  // ── B: WebKit — boot, layout, honest roster ──
  let B;
  try { B = await bootMobile(w, "webkit", webkitUA); pass("WebKit boots on a phone viewport: mobile shell live, CPU rung offered, every in-tab rung one this device can run, no console errors"); }
  catch (e) { fail(`WebKit boot: ${e.message}`); }

  // ── A signs in, preserves a room, and stays open (its watcher is live) ──
  try {
    await signIn(A.page, "Chromium A");
    await door(A.page, "/preserve mobile e2e chat", "Chromium A");
    await waitFor(() => chatText(A.page).then((t) => /made a private room|room:/.test(t)), { timeout: 20_000, label: "A made the room" });
    await door(A.page, "/matrix members", "Chromium A");
    await waitFor(() => chatText(A.page).then((t) => /members of/.test(t)), { timeout: 10_000, label: "A sealed a turn" });
    pass("Chromium A signed in and preserved a room with a real sealed turn");
  } catch (e) { fail(`Chromium A matrix flow: ${e.message}`); }

  // ── B signs in as the SAME account: granted automatically, reads history ──
  try {
    await signIn(B.page, "WebKit B");
    await waitFor(() => chatText(B.page).then((t) => /opened this account's chat|read back and decrypted here|arrived from another device/.test(t)), { timeout: 45_000, label: "B reconciled into the account's room" });
    await waitFor(() => chatText(B.page).then((t) => /members of/.test(t)), { timeout: 15_000, label: "B replayed A's preserved turn" });
    pass("WebKit B signed in as the same account, was granted the key automatically, and read the history");
  } catch (e) { fail(`WebKit B sibling flow: ${e.message}`); }

  // ── B seals a turn of its own; A's open page receives it LIVE ──
  try {
    await door(B.page, "/matrix rooms", "WebKit B");
    await waitFor(() => chatText(B.page).then((t) => /room\(s\)/.test(t)), { timeout: 10_000, label: "B sealed its turn" });
    await waitFor(() => chatText(A.page).then((t) => /arrived from another device/.test(t)), { timeout: 30_000, label: "A received B's turn live" });
    await A.page.screenshot({ path: join(OUT_DIR, "chromium-received-live.png") });
    pass("WebKit B preserved a turn that arrived on Chromium A's open page LIVE, without a reload — the connection carries the chat between uses");
  } catch (e) { fail(`live cross-engine delivery: ${e.message}`); }

  // ── the matrix-client module-level watchHistory e2e in BOTH engines ──
  // Runs ENTIRELY inside the page (functions cannot cross the evaluate
  // boundary): the real matrix-client code, over the real homeserver, in the
  // engine's own network stack. Returns a plain report string.
  const matrixModuleE2E = async (page, engine, hsBase) => {
    const report = await page.evaluate(async ({ hsBase, engine, pw }) => {
      const { FoldMatrix, localStorageStorage } = await import("/matrix-client.js");
      const storageA = () => localStorageStorage(`e2e-${engine}-a`);
      const storageB = () => localStorageStorage(`e2e-${engine}-b`);
      const A = new FoldMatrix({ storage: storageA(), record: () => {} });
      const B = new FoldMatrix({ storage: storageB(), record: () => {} });
      await A.login(hsBase, "alice", pw);
      await B.login(hsBase, "alice", pw);
      const room = await A.ensureRoom({ name: `e2e-${engine}` });
      await A.preserve(room, [{ kind: "turn", role: "user", content: `hello from ${engine}`, seq: 0 }]);
      await B.announceSibling(room);
      const granted = await A.grantPending(room);
      if (!granted.siblings.length) throw new Error("sibling not granted");
      if (!(await B.keyFor(room))) throw new Error("sibling did not receive the key");
      const loaded = await B.load(room);
      if (!loaded.entries.some((e) => e.content?.includes(`hello from ${engine}`))) throw new Error("sibling did not read the history");
      const seen = [];
      const ac = new AbortController();
      const watch = A.watchHistory(room, { signal: ac.signal, onEntries: (fresh) => seen.push(...fresh) });
      await new Promise((r) => setTimeout(r, 200));
      await B.preserve(room, [{ kind: "turn", role: "user", content: `live from ${engine}-sibling`, seq: 5 }]);
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline && !seen.some((e) => e.content?.includes("live from"))) await new Promise((r) => setTimeout(r, 100));
      ac.abort();
      await watch.catch(() => {});
      if (!seen.some((e) => e.content?.includes("live from"))) throw new Error("watchHistory did not deliver the sibling's turn");
      return `ok — sibling grant → history read → live delivery in ${engine}`;
    }, { hsBase, engine, pw: PW.alice });
    return report;
  };
  try {
    const r1 = await matrixModuleE2E(A.page, "chromium", HS_BASE);
    const r2 = await matrixModuleE2E(B.page, "webkit", HS_BASE);
    pass(`matrix-client watchHistory sibling-delivery runs end to end in BOTH engines (${r1}; ${r2})`);
  } catch (e) { fail(`module watchHistory e2e: ${e.message}`); }

  // console-error check across both pages (post-connect)
  for (const [name, d] of [["Chromium A", A], ["WebKit B", B]]) {
    if (d.errors.length) fail(`${name} console/page errors: ${[...new Set(d.errors)].slice(0, 4).join(" | ")}`);
    else pass(`${name} clean console`);
  }

  await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {});

  // ── heimdall surfaces ──
  console.log("Heimdall:");
  try {
    const health = await fetch(`http://localhost:${CHAT_PORT}/health`);
    if (!health.ok) throw new Error(`/health ${health.status}`);
    const j = await health.json();
    if (j.surface !== "fold-chat") throw new Error(`/health names the wrong surface: ${j.surface}`);
    pass("serve.mjs /health answers — the fold-chat surface Heimdall's registry now watches");
  } catch (e) { fail(`/health: ${e.message}`); }
  try {
    await waitFor(async () => {
      const r = await fetch(`http://localhost:${CHAT_PORT}/heimdall`);
      if (!r.ok) return false;
      const h = await r.json();
      return !!(h.vitals && (h.vitals.matrix || h.vitals.engine));
    }, { timeout: 40_000, label: "page vitals reached /heimdall" });
    const agg = await (await fetch(`http://localhost:${CHAT_PORT}/heimdall`)).json();
    if (!agg.vitals || !agg.vitals.matrix) throw new Error(`vitals.matrix missing: ${JSON.stringify(agg.vitals)}`);
    pass("the page's heimdall watcher posted its Matrix/engine vitals; /heimdall folds them in for the machine's Heimdall");
  } catch (e) { fail(`/heimdall vitals: ${e.message}`); }
  try {
    const r = await fetch(`http://localhost:${EXPLORE_PORT}/heimdall`);
    if (r.status === 200) { pass("explore-server /heimdall forwards the bridge status"); }
    else if (r.status === 503) {
      const j = await r.json();
      if (!/bridge/.test(j.error?.type ?? "")) throw new Error(`untyped 503: ${JSON.stringify(j)}`);
      pass("explore-server /heimdall answers the graceful bridge_down 503 when no steer port runs — never a hang");
    } else throw new Error(`explore /heimdall answered ${r.status}`);
  } catch (e) { fail(`explore /heimdall: ${e.message}`); }

  await b.close(); await w.close();
} catch (e) {
  console.error(`\nFATAL: ${e.message}`);
  await shutdown();
  process.exit(1);
} finally {
  await shutdown();
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall mobile e2e checks passed — Chromium and WebKit");
process.exit(0);