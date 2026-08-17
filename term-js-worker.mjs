// term-js-worker.mjs — the terminal's javascript runtime. A dedicated module
// Worker: no DOM, no page state, and — the point — no egress: every API that
// could carry a byte off this machine is severed at boot, before the first
// line of operator code runs. An authority wall by construction (skills.js's
// own disclosed posture), with P1 as the outer wall; term.test.mjs asserts
// this file's severed list agrees with term.js's canonical one.
//
// The REPL is honest about scope: `var` and `function` declarations persist
// across lines (indirect eval runs in this worker's global scope);
// `let`/`const` live only within their own line — said in the ready note
// rather than papered over with a rewriter.

export const SEVERED = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "WebTransport", "importScripts", "Worker", "SharedWorker", "caches"];

function sever() {
  for (const name of SEVERED) {
    try {
      Object.defineProperty(globalThis, name, { value: undefined, configurable: false, writable: false });
    } catch {
      /* absent in this browser — nothing to sever */
    }
  }
}

/** One value, shown: JSON where it can be, String where it cannot. */
function show(v) {
  if (typeof v === "string") return v;
  if (typeof v === "function") return String(v);
  try {
    const s = JSON.stringify(v);
    if (s !== undefined) return s;
  } catch {
    /* cycles, BigInt — String below */
  }
  return String(v);
}

// Only wire the worker when we ARE one — node imports this file for its
// severed list and helpers, and must get definitions, not a boot.
if (typeof self !== "undefined" && typeof self.postMessage === "function" && typeof window === "undefined") {
  const post = (m) => self.postMessage(m);
  let material = {};

  for (const key of ["log", "info", "debug"]) console[key] = (...a) => post({ type: "out", text: a.map(show).join(" ") });
  for (const key of ["warn", "error"]) console[key] = (...a) => post({ type: "err", text: a.map(show).join(" ") });

  // The one door back to the fold: the loaded material, read-only, by name.
  globalThis.material = (name) => {
    if (name === undefined) return Object.keys(material);
    if (!(name in material)) throw new Error(`no source named "${name}" — material() lists what crossed`);
    return material[name];
  };

  self.onmessage = async (ev) => {
    const m = ev.data ?? {};
    if (m.type === "boot") {
      material = m.sources ?? {};
      sever();
      post({
        type: "ready",
        note: `js ready — a Worker with ${SEVERED.length} egress APIs severed (${SEVERED.slice(0, 4).join(", ")}, …). var/function persist across lines; let/const do not. material(name) reads what crossed; material() lists it.`,
      });
      return;
    }
    if (m.type === "sources") {
      material = m.sources ?? {};
      post({ type: "out", text: `material re-mounted: ${Object.keys(material).length} source(s)` });
      post({ type: "done" });
      return;
    }
    if (m.type !== "exec") return;
    const code = String(m.code ?? "");
    const started = Date.now();
    try {
      let value;
      const hasAwait = /\bawait\b/.test(code);
      try {
        // Expression first — `2+2`, `{a:1}`, `[..].map(f)` — so a value shows
        // without a `return`. Statements are the fallback, where declarations
        // land on the global and persist.
        value = hasAwait ? await (0, eval)(`(async () => (${code}))()`) : (0, eval)(`(${code})`);
      } catch (e) {
        if (!(e instanceof SyntaxError)) throw e;
        value = hasAwait ? await (0, eval)(`(async () => { ${code} })()`) : (0, eval)(code);
      }
      if (value !== undefined) post({ type: "out", text: show(value) });
    } catch (e) {
      post({ type: "err", text: e instanceof Error ? `${e.name}: ${e.message}` : show(e) });
    }
    post({ type: "done", ms: Date.now() - started });
  };
}
