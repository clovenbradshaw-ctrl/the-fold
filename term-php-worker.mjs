// term-php-worker.mjs — the terminal's php runtime: PHP compiled to wasm
// via Emscripten (seanmorris/php-wasm, npm package "php-wasm"), vendored in
// node_modules and served from localhost (P1). A module Worker: every file
// this package ships as `.mjs` is a plain ES module, and its top-level
// PhpWeb class dynamically loads its OWN version-specific build (a plain
// runtime specifier, not a static one) — no bundler asset trickery.
//
// This is the SECOND candidate the vendoring research named, not the
// first, and the substitution is disclosed here rather than silently made.
// The first candidate — @php-wasm/web + @php-wasm/universal, the
// WordPress-Playground-backed package — was installed and read, and its
// published web build genuinely cannot load in this repo's architecture:
// the per-version glue file inside @php-wasm/web-8-3 opens with a STATIC
// import of its own wasm binary as a module specifier — a Vite-only
// asset-URL pattern that only resolves under a bundler. serve.mjs's own
// header states the house rule this collides with: "plain ES modules
// loaded straight from disk" — loading that file fails at the browser's
// module-script step (the server answers a .wasm request with
// `application/wasm`, not a JS content type, so the static import cannot
// even parse). This is a verified, not assumed, incompatibility — found by
// installing the package and reading its actual shipped source, the same
// way P5.5 asks a driver to be checked before a theory. `php-wasm`
// (seanmorris/php-wasm, Apache-2.0) was the second candidate the research
// named as a legitimate, currently-maintained fallback, and its own
// `PhpWeb`/`PhpBase` classes use plain relative dynamic imports and
// `fetch()` throughout — verified by reading every file this worker
// imports, not merely trusted from its README.
//
// The size cost of the substitution is real and disclosed rather than
// glossed over: this package has no per-version install (unlike
// @ruby/3.3-wasm-wasi's own scoped package name) — `npm install php-wasm`
// vendors PHP 8.0 through 8.5 together, ~182MB unpacked, of which this
// worker ever loads ONE version's ~13MB wasm binary at runtime (PhpWeb's
// own per-version load is a genuine dynamic import, so the other five
// versions' code and binaries are never fetched by the browser — only
// vendored on disk). node_modules is gitignored in this repo, so this is
// a one-time local `npm install` cost, not something that rides into the
// git history.
//
// PhpBase/PhpWeb reference `navigator.locks` (the Web Locks API, used to
// serialize filesystem access across queued calls) and `EventTarget` —
// both present in a dedicated Worker's global scope; nothing in the chain
// this file imports (PhpWeb.mjs, PhpBase.mjs, OutputBuffer.mjs, _Event.mjs,
// fsOps.mjs, resolveDependencies.mjs, webTransactions.mjs, and the
// version's own build glue) references `window` or `document` — checked
// by reading each file, not assumed from the package being labelled "web".
//
// Egress is severed once boot resolves — mounting material (mkdir/
// writeFile) is a pure in-memory MEMFS operation with no fetch of its own,
// so there is no "first exec" deferral needed the way pyodide's package
// loader forces on term-py-worker.mjs.
//
// PHP has no implicit last-expression echo (unlike ruby/python/js here) —
// `1+1;` alone prints nothing in real PHP, only `echo`/`var_dump`/`print_r`
// do; the ready note says so rather than leaving it to be discovered as a
// silent difference.

const PHP_VERSION = "8.3";
const PHP_WEB_PKG = "/node_modules/php-wasm/PhpWeb.mjs";

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

/** A source name becomes one MEMFS file name — path separators cannot ride in (mirrors term-py-worker.mjs's mountName). */
export const mountName = (name) => name.replace(/[/\\]+/g, "_").replace(/^\.+/, "_") || "_";

if (typeof self !== "undefined" && typeof self.postMessage === "function" && typeof window === "undefined") {
  const post = (m) => self.postMessage(m);
  let php = null;

  const mount = async (sources) => {
    try {
      await php.mkdir("/material");
    } catch {
      /* already there */
    }
    const names = Object.keys(sources ?? {});
    for (const name of names) await php.writeFile(`/material/${mountName(name)}`, sources[name]);
    return names.length;
  };

  self.onmessage = async (ev) => {
    const m = ev.data ?? {};
    if (m.type === "boot") {
      try {
        // The vendored Emscripten build's factory function references the
        // bare identifiers `document` and `window` UNCONDITIONALLY at its
        // own top level (`specialHTMLTargets=[0,document,window]`, part of
        // dead fullscreen/canvas/audio-context runtime glue this text-mode
        // SAPI never calls) — a real bug, measured live: importing PhpWeb
        // in a genuine dedicated Worker throws `document is not defined`
        // before pib_init ever runs, because a bare identifier that was
        // NEVER assigned throws on reference even where `typeof` would not.
        // Assigning `undefined` (not a functional stub) is the minimal fix:
        // it makes the identifier REFERENCEABLE without making it anything
        // other than absent — `typeof window` still reads "undefined"
        // afterward, so loadPHPRuntime's own environment detection
        // (`typeof window<"u" ? "WEB" : … "WORKER"`) still correctly
        // resolves WORKER, unchanged from before this assignment. Real
        // fullscreen/canvas/audio calls (never made by any PHP this
        // terminal runs) would still fail loudly on the genuine absence,
        // exactly as they should.
        globalThis.document = undefined;
        globalThis.window = undefined;
        const { PhpWeb } = await import(PHP_WEB_PKG);
        const inst = new PhpWeb({ version: PHP_VERSION });
        // OutputBuffer flushes per newline (maxLength: -1, byte 10) — this
        // is real streaming, the same posture consolePrinter gives ruby,
        // not a wait-for-the-whole-run buffer.
        inst.onoutput = (event) => post({ type: "out", text: event.detail[0] });
        inst.onerror = (event) => post({ type: "err", text: event.detail[0] });
        await inst.binary; // resolves once the wasm is fetched, instantiated, and pib_init has run
        php = inst;
        const n = await mount(m.sources);
        sever();
        post({
          type: "ready",
          note: `php ${php.phpVersion} ready (php-wasm/emscripten, local) — no <?php tag needed, type statements directly; no implicit last-expression echo (use echo/var_dump); ${n} source(s) mounted at /material (php.readFile, php.readdir). no network once this line runs: ${SEVERED.length} egress APIs severed.`,
        });
      } catch (e) {
        post({ type: "err", text: `the php runtime could not boot: ${e.message ?? e}` });
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
    if (m.type !== "exec" || !php) return;
    const code = String(m.code ?? "");
    const started = Date.now();
    try {
      // Measured live, not assumed from the docstring: `run()`'s own
      // `?>${phpCode}` prefix does NOT put bare statements in PHP mode the
      // way its comment reads — `echo 1+1;` typed with no tag came back
      // ECHOED AS LITERAL TEXT ("echo 1+1;", not "2"), because the leading
      // `?>` only closes an ALREADY-open PHP context; with none open, the
      // whole string starts in HTML-passthrough mode and stays there. This
      // worker owns the tag, always, so the ready note's promise ("no
      // <?php tag needed") holds regardless of what run() does internally.
      await php.run(`<?php\n${code}`);
    } catch (e) {
      post({ type: "err", text: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
    }
    post({ type: "done", ms: Date.now() - started });
  };
}
