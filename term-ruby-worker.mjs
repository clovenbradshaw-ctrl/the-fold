// term-ruby-worker.mjs — the terminal's ruby runtime: CRuby cross-compiled
// to wasm32-wasi (ruby/ruby.wasm), vendored in node_modules and served from
// localhost like every other byte this page loads (P1). A module Worker,
// because @ruby/wasm-wasi ships ESM (its own package.json names a real
// "module" entry point) — matching term-py-worker.mjs's reasoning for
// pyodide, not term-sql-worker.js's UMD case.
//
// This uses the LOW-LEVEL boot path — RubyVM.instantiateModule +
// consolePrinter — never the package's own `DefaultRubyVM` convenience
// wrapper, which hardcodes stdout to console.log/stderr to console.warn (a
// boolean toggle, no custom callback) and would give this terminal no real
// out/err capture at all, the same reason term-py-worker.mjs calls
// `pyodide.setStdout`/`setStderr` directly rather than trusting pyodide's
// own console defaults. Nothing on this path touches window/document —
// RubyVM, consolePrinter, and @bjorn3/browser_wasi_shim's WASI/File/
// Directory classes are plain ES modules operating on
// WebAssembly.Module/Instance, TextDecoder and DataView, all present in a
// Worker's global scope. Only the package's OWN convenience loader scripts
// (browser.script.iife.js, browser.umd.js) hard-attach `DefaultRubyVM` to
// `window` — this file imports neither.
//
// Egress is severed once boot resolves. Ruby is unlike python here: the
// vendored @ruby/3.3-wasm-wasi package ships the FULL interpreter *and*
// stdlib in one .wasm binary (ruby+stdlib.wasm) — nothing more is ever
// fetched once RubyVM.instantiateModule returns, so there is no "first
// exec's own imports" step to defer sever() past; it runs at the end of
// boot, matching term-js-worker.mjs's simpler timing rather than
// term-py-worker.mjs's delayed one.
//
// Loaded material mounts at /material inside a WASI PreopenDirectory. This
// is a plain JS object graph — Directory.contents is a Map<string,
// File|Directory> — not a real filesystem, so re-mounting (the `sources`
// message) just clears and repopulates that Map; `File.read("/material/x")`
// and `Dir.entries("/material")` on the Ruby side just work against it, the
// same shape python's MEMFS mount gives pyodide.
//
// No gem/bundler organ exists here (no equivalent of P21's wheel organ for
// Ruby) — RubyGems' own network install path needs egress this sandbox
// does not have, and building one is out of scope for this pass; `require`
// works for anything the stdlib ships (json, set, date, ...), and a `gem
// install` attempt fails as an ordinary Ruby exception (no gem source
// configured), not a crafted refusal — said in the ready note rather than
// silently promised.

const RUBY_WASM = "/node_modules/@ruby/3.3-wasm-wasi/dist/ruby+stdlib.wasm";
const RUBY_PKG = "/node_modules/@ruby/wasm-wasi/dist/esm/index.js";
const WASI_SHIM_PKG = "/node_modules/@bjorn3/browser_wasi_shim/dist/index.js";

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

/** A source name becomes one WASI directory-entry name — path separators
 * cannot ride in (mirrors term-py-worker.mjs's mountName). */
export const mountName = (name) => name.replace(/[/\\]+/g, "_").replace(/^\.+/, "_") || "_";

// Ruby's def/end multi-line continuation grammar lives in term.js's own
// `continues()`, beside python's `:` rule and sql's `;` rule — it is a
// property of the TERMINAL's input buffering, not of this worker's exec
// protocol, so it is not duplicated here.

if (typeof self !== "undefined" && typeof self.postMessage === "function" && typeof window === "undefined") {
  const post = (m) => self.postMessage(m);
  const encoder = new TextEncoder();
  let vm = null;
  let materialDir = null; // the WASI Directory backing /material; its .contents Map is mutated to re-mount
  let FileCtor = null;

  const mount = (sources) => {
    materialDir.contents.clear();
    const names = Object.keys(sources ?? {});
    for (const name of names) materialDir.contents.set(mountName(name), new FileCtor(encoder.encode(sources[name]), { readonly: true }));
    return names.length;
  };

  self.onmessage = async (ev) => {
    const m = ev.data ?? {};
    if (m.type === "boot") {
      try {
        const [{ RubyVM, consolePrinter }, { WASI, File, OpenFile, Directory, PreopenDirectory }] = await Promise.all([import(RUBY_PKG), import(WASI_SHIM_PKG)]);
        FileCtor = File;
        materialDir = new Directory(new Map());
        const fds = [new OpenFile(new File([])), new OpenFile(new File([])), new OpenFile(new File([])), new PreopenDirectory("/", new Map([["material", materialDir]]))];
        const wasi = new WASI([], [], fds, { debug: false });
        const printer = consolePrinter({
          stdout: (s) => post({ type: "out", text: s }),
          stderr: (s) => post({ type: "err", text: s }),
        });
        const module = await WebAssembly.compileStreaming(fetch(RUBY_WASM));
        const { vm: rubyVm } = await RubyVM.instantiateModule({
          module,
          wasip1: wasi,
          addToImports: (imports) => printer.addToImports(imports),
          setMemory: (memory) => printer.setMemory(memory),
        });
        vm = rubyVm;
        const n = mount(m.sources);
        const version = vm.eval("RUBY_VERSION").toString();
        sever();
        post({
          type: "ready",
          note: `ruby ${version} ready (ruby.wasm/wasi, local) — full CRuby + stdlib in one .wasm binary, no separate package fetch; ${n} source(s) mounted at /material (File.read, Dir.entries). no gem organ here — \`require\` reaches the stdlib only. no network once this line runs: ${SEVERED.length} egress APIs severed.`,
        });
      } catch (e) {
        post({ type: "err", text: `the ruby runtime could not boot: ${e.message ?? e}` });
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
    if (m.type !== "exec" || !vm) return;
    const code = String(m.code ?? "");
    const started = Date.now();
    try {
      const result = vm.eval(code);
      let isNil = false;
      try {
        isNil = result.call("nil?").toString() === "true";
      } catch {
        /* a value that can't answer nil? (shouldn't happen for a real RbValue) — show it anyway */
      }
      if (!isNil) post({ type: "out", text: result.toString() });
    } catch (e) {
      post({ type: "err", text: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
    }
    post({ type: "done", ms: Date.now() - started });
  };
}
