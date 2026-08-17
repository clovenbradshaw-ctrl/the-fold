// term-py-worker.mjs — the terminal's python runtime: pyodide, vendored in
// node_modules and served from localhost like every other byte this page
// loads (P1 — no CDN, and so no PyPI: micropip is not shipped and pip is
// refused with its reason, not a stack trace). A module Worker, because
// pyodide's loader is an ES module and dynamic import inside one is the one
// portable path; the import happens inside boot so node can import this
// file's severed list without resolving /node_modules/… URLs.
//
// Egress is severed AFTER the boot — loadPyodide itself fetches the wasm
// and stdlib from localhost — and before the first operator line runs.
// Loaded material mounts at /material in the MEMFS, so `open("/material/…")`
// just works; there is no other filesystem, which is the point.
//
// numpy/matplotlib/pandas (+ transitive deps) are vendored the same way as
// the runtime itself (scripts/fetch-pyodide-packages.sh mirrors their wheels
// into node_modules/pyodide/, sha256-verified against pyodide-lock.json).
// Loading all three unconditionally at boot was tried first and measured
// live: 60-70s before "ready" even on a warm cache, because instantiating
// numpy+matplotlib+pandas costs CPU, not network — a boot cost the common
// stdlib-only session should never pay. So loading is LAZY and SCOPED to
// what the code actually imports, via pyodide's own loadPackagesFromImports
// (it reads import statements the way this codebase already reads other
// closed classes — no regex of our own). That call still needs fetch, so it
// runs on the FIRST exec's code, still before sever() — the severance
// invariant (nothing after boot's first exec ever touches the network) holds
// exactly, just moved one step later than the old "at boot" version. The
// disclosed cost: only the first exec's imports resolve; a later exec in the
// same session naming a NEW package fails the same way a stdlib-only session
// always would — sever() has no exception either version of this file.
const VENDORED_PACKAGES = ["numpy", "matplotlib", "pandas"];

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

/** A source name becomes one MEMFS file name — path separators cannot ride in. */
export const mountName = (name) => name.replace(/[/\\]+/g, "_").replace(/^\.+/, "_") || "_";

if (typeof self !== "undefined" && typeof self.postMessage === "function" && typeof window === "undefined") {
  const post = (m) => self.postMessage(m);
  let pyodide = null;
  let severed = false;

  const mount = (sources) => {
    const names = Object.keys(sources ?? {});
    try {
      pyodide.FS.mkdirTree("/material");
    } catch {
      /* already there */
    }
    for (const name of names) pyodide.FS.writeFile(`/material/${mountName(name)}`, sources[name], { encoding: "utf8" });
    return names.length;
  };

  self.onmessage = async (ev) => {
    const m = ev.data ?? {};
    if (m.type === "boot") {
      try {
        const { loadPyodide } = await import("/node_modules/pyodide/pyodide.mjs");
        pyodide = await loadPyodide({ indexURL: "/node_modules/pyodide/" });
        pyodide.setStdout({ batched: (s) => post({ type: "out", text: s }) });
        pyodide.setStderr({ batched: (s) => post({ type: "err", text: s }) });
        const n = mount(m.sources);
        const version = pyodide.runPython("import sys; sys.version.split()[0]");
        post({
          type: "ready",
          note: `python ${version} ready (pyodide, local) — stdlib; numpy/matplotlib/pandas load on first use (vendored, no others); ${n} source(s) mounted at /material. no network once the first line runs: ${SEVERED.length} egress APIs sever then.`,
        });
      } catch (e) {
        post({ type: "err", text: `the python runtime could not boot: ${e.message}` });
        post({ type: "done" });
      }
      return;
    }
    if (m.type === "sources") {
      const n = mount(m.sources);
      post({ type: "out", text: `material re-mounted: ${n} source(s) at /material` });
      post({ type: "done" });
      return;
    }
    if (m.type !== "exec" || !pyodide) return;
    const code = String(m.code ?? "");
    if (/^\s*(pip|python\s+-m\s+pip|%pip)\b/.test(code)) {
      post({ type: "err", text: `pip is refused here: installs need the network, and this page loads nothing remote (P1). the vendored set is all there is: stdlib plus ${VENDORED_PACKAGES.join(", ")}.` });
      post({ type: "done" });
      return;
    }
    const started = Date.now();
    try {
      if (!severed) {
        // The one place fetch is still live: resolving THIS code's own
        // imports against the vendored set, same-origin, before anything
        // untrusted runs. loadPackagesFromImports silently no-ops on
        // imports it doesn't recognize (stdlib, or a name not vendored) —
        // the ModuleNotFoundError those still throw is Python's own, not a
        // network error, so it reads the same as any other unmet import.
        await pyodide.loadPackagesFromImports(code, { messageCallback: () => {} });
        if (VENDORED_PACKAGES.some((p) => pyodide.loadedPackages[p])) {
          pyodide.runPython("import sys\nif 'matplotlib' in sys.modules:\n import matplotlib\n matplotlib.use('AGG')");
        }
        sever();
        severed = true;
      }
      const value = await pyodide.runPythonAsync(code);
      if (value !== undefined) {
        post({ type: "out", text: String(value) });
        value?.destroy?.();
      }
    } catch (e) {
      post({ type: "err", text: String(e.message ?? e) });
    }
    post({ type: "done", ms: Date.now() - started });
  };
}
