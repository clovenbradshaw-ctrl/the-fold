// solon-run.mjs — runs Solon (the Integrity keeper, eoreader7's organs/solon.js)
// over THIS repository. The organ is a library and knows no repo; this file
// hands it this one: the root, the constitution's enforcement map, where the
// transcriptions and their reader tests live, and a probe of this surface's port.
//
//   node solon-run.mjs                   one full sweep, standing = null (establishes)
//   node solon-run.mjs --json            raw JSON only
//   node solon-run.mjs --daemon [port]   the keeper: heartbeat + sweeps + /solon + /health

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runLiveSweep, createKeeper, startServer } from "../eoreader7/native/organs/solon.js";
import { ENFORCEMENT } from "./constitution.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ER7_FOLD = path.join(HERE, "../eoreader7/native/eval/the-fold");

/** What Solon keeps when it keeps this repository. */
export const SOLON_CONFIG = {
  root: HERE,
  enforcement: ENFORCEMENT,
  resultsRoots: [
    { resultsDir: path.join(HERE, "eval/results"), driverDir: path.join(HERE, "eval"), testDirs: [path.join(HERE, "eval"), HERE] },
    { resultsDir: path.join(ER7_FOLD, "results"), driverDir: ER7_FOLD, testDirs: [path.join(HERE, "../eoreader7/native/tests"), ER7_FOLD] },
  ],
};

/** The sweep Solon runs over this repository. */
export const sweepThisRepo = (standing) => runLiveSweep(standing, SOLON_CONFIG);

export function probeFoldSurface(port = Number(process.env.ER7_SOLON_PROBE_PORT ?? 8812)) {
  return async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 1500);
      const r = await fetch(`http://127.0.0.1:${port}/v1/models`, { signal: ctrl.signal });
      clearTimeout(t);
      return { surface: "fold-surface", at: Date.now(), result: r.ok ? "surface_up" : `surface_http_${r.status}` };
    } catch (e) {
      return { surface: "fold-surface", at: Date.now(), result: "surface_unreachable", why: String(e?.message ?? e) };
    }
  };
}

const isMain = (() => {
  try {
    return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();

if (isMain) {
  if (process.argv.includes("--daemon")) {
    const portArg = process.argv[process.argv.indexOf("--daemon") + 1];
    const keeper = createKeeper({ root: HERE, onSweep: sweepThisRepo, probe: probeFoldSurface() });
    keeper.start();
    startServer(keeper, portArg && /^\d+$/.test(portArg) ? Number(portArg) : undefined);
  } else {
    const json = process.argv.includes("--json");
    const verdicts = await sweepThisRepo(null);
    if (json) {
      process.stdout.write(JSON.stringify(verdicts, null, 2) + "\n");
    } else {
      const suiteLine = verdicts.suite.deferred
        ? `suite   : deferred — load ${verdicts.suite.loadavg.toFixed(1)} > ${verdicts.suite.parallelism} parallel (the watcher will not create the load it measures)`
        : `suite   : ${verdicts.suite.ok ? "clean" : `${verdicts.suite.failures.length} failing`}`;
      process.stdout.write(suiteLine + "\n");
      process.stdout.write(`map     : ${verdicts.map.verdict}${verdicts.map.failures.length ? " — " + verdicts.map.failures.map((f) => f.article).join(", ") : ""}\n`);
      process.stdout.write(`results : ${verdicts.results.unenforcedCount} unenforced of ${verdicts.results.transcriptionCount} transcriptions\n`);
      process.stdout.write(`record  : ${verdicts.record.verdict}\n`);
      process.stdout.write(`took    : ${verdicts.durationMs}ms\n`);
    }
  }
}
