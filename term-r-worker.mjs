// term-r-worker.mjs — the terminal's r runtime: R compiled to wasm via
// webR (r-wasm/webr, Posit-backed), vendored in node_modules and served
// from localhost (P1). A module Worker: dist/webr.js is real ESM (`export
// {ChannelType, WebR, Shelter, ...}`, checked by reading the file, not
// assumed from its extension) — see WEBR_PKG below for why it is
// `webr.js`, not the package's own declared "main" (`webr.mjs`).
//
// DISCLOSED, NARROWER SANDBOX THAN EVERY OTHER RUNTIME HERE — read before
// touching this file or adding "r" anywhere near AUTO_RUN_LANGS.
// js/python/ruby/sql each run entirely inside the ONE Worker term.js
// itself spawns, so `sever()` — defineProperty-ing fetch/XHR/etc away —
// closes every egress path that worker could reach. webR's own
// architecture does not fit that shape: `new WebR(...)` unconditionally
// spawns a SECOND, nested Worker (`new Worker(`${baseUrl}webr-worker.js`)`,
// confirmed by reading webr.mjs directly) to run the actual R engine, and
// that nested worker's source is r-wasm's own vendored file — this repo
// does not author it and cannot inject a sever() into its global scope
// before it runs (Worker-in-Worker is supported by every current engine,
// per the vendoring research; the gap is authorship, not platform support).
// Severing fetch/XHR in THIS file's own scope (below) stops nothing that
// nested worker could do — it is real defense in depth for the CONTROLLER
// this file drives, not a closure of the gap.
//
// What that gap concretely is: plain R code execution touches no network
// at all — `download.file()`/`url()` need a configured proxy
// (WebROptions.serviceWorkerUrl), left unset here (empty string, webR's
// own default), so they fail the ordinary way an offline machine fails
// them. The one real path is R's OWN package installer — `webr::install()`
// / `install.packages()` — which talks to `repoUrl` (webR's own default,
// left unset here rather than restated — its real value is the r-wasm
// project's own package-repository host, never a localhost address) from
// INSIDE the nested worker. Nothing in this file wires an equivalent of
// P21's wheel organ for R (no fold command fetches or vets R packages), so
// the only way that path is reached at all is operator-typed R code
// calling it directly — same class of residue P14 already discloses for
// the skills sandbox ("an authority wall by construction... not a
// hardened security boundary").
//
// The consequence drawn from this, not left implicit: "r" is NOT added to
// AUTO_RUN_LANGS in term.js. It is reachable only by a person typing `r`
// at the fold prompt and driving it themselves — never by a model's
// fold auto-running, and never by the chat's one-shot `/run` door, both of
// which are automatic, instrument-decided crossings the other four
// runtimes' full parity earns and this one does not yet.
//
// Egress IS severed in this file's own scope once boot resolves — narrower
// than the guarantee it can make, stated as exactly that above, not as
// "network severed" without qualification the way the other workers'
// ready notes can honestly say it.
//
// A verification note, so a future reader doesn't re-chase this: the FIRST
// live attempt at boot, in an AI coding assistant's own sandboxed preview
// pane, failed with an opaque, detail-stripped worker error — and turned
// out to be nothing about this file. A minimal control (a plain worker
// spawning ANOTHER plain worker, no webR involved) failed identically in
// that same pane, and succeeded cleanly in a real, unsandboxed Chrome tab
// against this same server. The pane itself restricts nested Worker
// creation; that restriction is not a property of a real browser, of
// webR, or of this file. Verify this runtime in a real browser tab, not
// an embedded preview pane, if it ever appears broken again.

const R_BASE_URL = "/node_modules/webr/dist/";
// package.json's own `exports` map sends bundlers to dist/webr.js under the
// "browser" condition and to dist/webr.mjs under "import" — a resolver
// distinction a literal path import can't see, so it must be chosen here
// explicitly rather than defaulting to "main". Measured live, the two are
// NOT interchangeable: dist/webr.mjs opens with unconditional, top-level
// `import {createRequire} from 'module'` (plus 'url'/'path') — genuine
// Node built-ins, statically imported, so the module fails to even PARSE
// in a Worker ("Failed to resolve module specifier 'module'") before any
// of webR's own code runs. dist/webr.js is the real browser build: the
// same exported surface (WebR, Shelter, ChannelType, …), confirmed by
// reading it directly, with no Node-only import anywhere in it.
const WEBR_PKG = "/node_modules/webr/dist/webr.js";

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

/** A source name becomes one FS entry name — path separators cannot ride in (mirrors term-py-worker.mjs's mountName). */
export const mountName = (name) => name.replace(/[/\\]+/g, "_").replace(/^\.+/, "_") || "_";

// R's bracket-nesting continuation grammar lives in term.js's own
// `continues()`, beside python's `:` rule, sql's `;` rule, and ruby's
// def/end rule — a property of the TERMINAL's input buffering, not of
// this worker's exec protocol, so it is not duplicated here.

if (typeof self !== "undefined" && typeof self.postMessage === "function" && typeof window === "undefined") {
  const post = (m) => self.postMessage(m);
  const encoder = new TextEncoder();
  let webR = null;

  const mount = async (sources) => {
    try {
      await webR.FS.mkdir("/material");
    } catch {
      /* already there */
    }
    const names = Object.keys(sources ?? {});
    for (const name of names) await webR.FS.writeFile(`/material/${mountName(name)}`, encoder.encode(sources[name]));
    return names.length;
  };

  /** One captureR output item → a posted out/err line. A stream item
   * ('stdout'/'stderr') carries plain text; a captured CONDITION (an
   * uncaught warning/message riding alongside — errors are re-thrown as a
   * JS exception by webR's own default and caught below, never reaching
   * here) carries an R condition object, shown by its own `message` field
   * when present. */
  const relay = (item) => {
    const text = typeof item.data === "string" ? item.data : (item.data?.message ?? JSON.stringify(item.data));
    post({ type: item.type === "stdout" ? "out" : "err", text: text.endsWith("\n") ? text : text + "\n" });
  };

  self.onmessage = async (ev) => {
    const m = ev.data ?? {};
    if (m.type === "boot") {
      try {
        const { WebR } = await import(WEBR_PKG);
        // baseUrl is stated explicitly and MUST be — webr.mjs's own real
        // default (read from its source, never assumed) resolves to a
        // remote r-wasm-project host whenever it does not detect a Node
        // environment, which would be a live P1 violation on first boot if
        // this were ever left unset. repoUrl is deliberately left at
        // webR's own default (the package-repository host `webr::install`
        // would reach — the disclosed gap this file's header names) rather
        // than restated here to the identical value.
        const inst = new WebR({ baseUrl: R_BASE_URL, serviceWorkerUrl: "", interactive: true });
        await inst.init();
        webR = inst;
        const version = await webR.evalRString("R.version.string");
        const n = await mount(m.sources);
        sever();
        post({
          type: "ready",
          note: `${version} ready (webR, local) — R code execution touches no network (no proxy configured); webr::install()/install.packages() runs inside webR's own nested worker and is NOT covered by this sandbox's sever — disclosed, not fixed, in this file's own header. ${n} source(s) mounted at /material (readLines, list.files). never auto-run: enter \`r\` at the fold prompt yourself.`,
        });
      } catch (e) {
        post({ type: "err", text: `the r runtime could not boot: ${e.message ?? e}` });
        post({ type: "done" });
      }
      return;
    }
    if (m.type === "sources") {
      const n = await mount(m.sources);
      post({ type: "out", text: `material re-mounted: ${n} source(s) at /material` });
      post({ type: "done" });
      return;
    }
    if (m.type !== "exec" || !webR) return;
    const code = String(m.code ?? "");
    const started = Date.now();
    try {
      const { output } = await webR.globalShelter.captureR(code, { withAutoprint: true, captureStreams: true, captureConditions: true });
      for (const item of output) relay(item);
    } catch (e) {
      post({ type: "err", text: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
    }
    post({ type: "done", ms: Date.now() - started });
  };
}
