// heimdall-client.js — the page's own watcher at Bifröst (2026-09-13): the
// DEF → EVA → REC loop heimdall.mjs (eoreader7) runs over proxy surfaces,
// applied to the browser's own live connections — the in-tab model engine
// and the Matrix room tie. A dead connection is measured, re-zeroed, and
// recorded, never assumed.
//
//   DEF — declare the void: the connections under watch, named.
//   EVA — evaluate: probe each one; only a measured breakdown reaches REC.
//   REC — re-zero: call the injected recover() for the broken connection,
//        record the act with its trigger. Never a silent restart.
//
// The walls (heimdall's own, kept):
//   - a probe that has never reported good is a first run, not a failure to
//     re-zero — it is reported as a standing, never recovered blindly;
//   - a probe already down is not re-recovered on every tick — recovery is
//     a transition, one act per break, not a drum;
//   - recovery itself is measured: a recover() that throws is recorded as
//     failed with its reason, never swallowed.
//
// Pure and node-testable: the probes, the recover handlers, and the record
// hook are all injected (the cast.js pattern). The page wires them to
// webllmClient and foldMatrix; a test wires counters.
export function createWatch({ probes = [], recover = async () => {}, act = () => {}, intervalMs = 15_000 } = {}) {
  const status = new Map(); // probe name -> { ok, reason, at, since }
  const lastGood = new Map(); // probe name -> ms of the last ok probe
  let controller = null;
  let running = false;

  async function tick() {
    for (const entry of probes) {
      const name = entry?.name ?? "probe";
      const fn = entry?.probe ?? entry;
      let r;
      try { r = await fn(); } catch (e) { r = { ok: false, reason: e?.message ?? String(e) }; }
      const now = Date.now();
      const prev = status.get(name);
      if (r.ok) {
        lastGood.set(name, now);
        status.set(name, { ok: true, at: now, since: prev?.since ?? now, reason: null });
        continue;
      }
      // A DOWN. REC fires on the break — from good to down. A probe still
      // down from a previous tick is left for its recoverer, never re-fired.
      const reason = r.reason ?? "no reason stated";
      status.set(name, { ok: false, at: now, since: prev?.since ?? now, reason });
      if (prev?.ok === false) continue;
      const good = lastGood.get(name) ?? 0;
      if (prev?.ok === true || good > 0) {
        let recovered = false; let detail = null;
        try { await recover(name, reason); recovered = true; }
        catch (e) { detail = e?.message ?? String(e); }
        act("rec", { probe: name, reason, recovered, detail });
      } else {
        act("eva", { probe: name, reason, standing: "first-run-down — not re-zeroed" });
      }
    }
  }

  return {
    get running() { return running; },
    start() {
      if (running) return;
      running = true;
      const ctrl = new AbortController();
      controller = ctrl;
      const loop = async () => {
        // ctrl is captured locally: stop() may null `controller` the moment
        // it aborts, and the loop must not read a null on its next pass.
        while (!ctrl.signal.aborted) {
          try { await tick(); } catch { /* one bad tick never ends the watch */ }
          await new Promise((r) => { const t = setTimeout(r, intervalMs); ctrl.signal.addEventListener("abort", () => { clearTimeout(t); r(); }, { once: true }); });
        }
      };
      loop();
    },
    stop() { running = false; const c = controller; controller = null; c?.abort(); },
    /** The watch's own report — what each connection stands at now, for the
     *  /api/vitals report the page posts and for /matrix's status line. */
    report() {
      return {
        running,
        probes: Object.fromEntries([...status.entries()].map(([k, v]) => [k, { ...v, at: new Date(v.at).toISOString(), since: new Date(v.since).toISOString() }])),
        lastGood: Object.fromEntries([...lastGood.entries()].map(([k, v]) => [k, new Date(v).toISOString()])),
      };
    },
  };
}