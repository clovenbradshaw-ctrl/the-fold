// boot-check.mjs — minimal CDP verification of the fold page's "logic"
// disclosure mode on a REAL page with a REAL turn: boot, ask a question,
// wait for the fold disclosure, click the record-view toggle, read the bare
// logic trace. Catches wiring errors a pure unit test cannot (the toggle
// listener in addMessage, renderFold's logic branch, boot-time errors).
// Run from the repo root: node eval/boot-check.mjs http://localhost:8899
const URL = process.argv[2] ?? "http://localhost:8899";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const { spawn } = await import("node:child_process");

const port = 9333 + Math.floor(Math.random() * 1000);
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run",
  `--remote-debugging-port=${port}`,
  "--user-data-dir=/tmp/bootcheck-profile-" + process.pid,
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(u, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(u); if (r.ok) return r.json(); } catch {}
    await sleep(500);
  }
  throw new Error("chrome devtools endpoint did not come up");
}
const version = await getJson(`http://127.0.0.1:${port}/json/version`);
// Commands need a PAGE target's websocket (the browser-level one has no
// execution context for Runtime.evaluate).
let target = (await getJson(`http://127.0.0.1:${port}/json/list`)).find((t) => t.type === "page");
if (!target) throw new Error("no page target");
const ws = new WebSocket(target.webSocketDebuggerUrl); // Node 22's native global WebSocket
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const pending = new Map();
const consoleErrors = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300));
  }
  if (msg.method === "Runtime.exceptionThrown") {
    consoleErrors.push("EXCEPTION: " + (msg.params.exceptionDetails?.text ?? "") + " " + (msg.params.exceptionDetails?.exception?.description ?? "").slice(0, 300));
  }
};
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error("page threw: " + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text));
  return r.result?.result?.value;
};

await send("Page.enable"); await send("Runtime.enable");
await send("Page.navigate", { url: URL });
await sleep(8000); // module graph + model list boot

const bootRaw = await send("Runtime.evaluate", {
  expression: `JSON.stringify({ served: !document.querySelector("#not-served"), composer: !!document.querySelector("#composer"), input: !!document.querySelector("#input") })`,
  returnByValue: true,
});
console.log("raw boot eval:", JSON.stringify(bootRaw).slice(0, 300));
const boot = bootRaw.result?.result?.value;
console.log("boot:", boot);

// Turn OFF the web switch so the turn answers without a slow preflight web
// hunt — the record still lands (the unbacked disclosure is the demo), just
// fast. The switch is the #use-web checkbox in the composer bar.
await evaluate(`(() => {
  const w = document.querySelector("#use-web");
  if (w && w.checked) { w.click(); }
  return true;
})()`);
// Ask a real question through the real composer.
await evaluate(`(() => {
  const input = document.querySelector("#input");
  input.value = "Who was Abraham Lincoln's first vice president?";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  document.querySelector("#composer").requestSubmit();
  return true;
})()`);
await sleep(3000);
const afterSubmit = await evaluate(`(() => {
  const msgs = [...document.querySelectorAll(".msg")].map((m) => ({ role: m.querySelector(".role-tag")?.textContent, body: (m.querySelector(".body")?.textContent ?? "").slice(0, 40) }));
  return JSON.stringify({ msgs, status: document.querySelector("#status-line")?.textContent ?? "" });
})()`);
console.log("after submit:", afterSubmit);

// Wait for an assistant turn with a fold disclosure whose record has
// actually landed (prose non-empty or the "more" details present).
let found = null;
for (let i = 0; i < 80; i++) {
  await sleep(2500);
  found = await evaluate(`(() => {
    const box = document.querySelector(".turn-meta > .fold");
    if (!box) return null;
    const txt = (box.querySelector("p")?.textContent ?? "").trim();
    return { hasFold: true, proseStart: txt.slice(0, 120), hasMore: !!box.querySelector("details.fold summary"), toggles: [...document.querySelectorAll(".record-view-toggle")].map(b => b.textContent) };
  })()`);
  if (found && found.proseStart) break;
}
if (!found) {
  console.log("NO ANSWER ARRIVED. console errors:", consoleErrors.length ? consoleErrors : "none");
  ws.close(); chrome.kill(); process.exit(1);
}
console.log("answer disclosure:", JSON.stringify(found));

// Click the toggle and read the bare-logic trace.
const logic = await evaluate(`(() => {
  const box = document.querySelector(".turn-meta > .fold");
  const btn = box.querySelector(".record-view-toggle");
  btn.click();
  return { text: (box.querySelector("p")?.textContent ?? "").slice(0, 400), stored: localStorage.getItem("fold-record-view") };
})()`);
console.log("logic mode:", JSON.stringify(logic, null, 2));
console.log("console errors:", consoleErrors.length ? consoleErrors : "none");

ws.close(); chrome.kill();
process.exit(consoleErrors.length ? 1 : 0);