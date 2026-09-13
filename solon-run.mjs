// solon-run.mjs — one live sweep, printed. The one-shot form of the keeper
// (cron-style), and the same sweep the daemon runs on its cadence.
//
//   node solon-run.mjs          — one full sweep, standing = null (establishes)
//   node solon-run.mjs --json   — raw JSON only

import { runLiveSweep } from "./solon.js";

const json = process.argv.includes("--json");
const verdicts = await runLiveSweep(null);
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