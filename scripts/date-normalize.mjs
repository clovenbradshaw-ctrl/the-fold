#!/usr/bin/env node
// scripts/date-normalize.mjs — a real math/date tool, not a hand-rolled
// parser (direct instruction, 2026-09-10: "leverage pyodide for things
// like date reformatting and should leverage math tools whenever
// possible").
//
// eoreader7's `native/organs/regime.js::parseValidityWindow` ships a
// zero-dependency default (`Date.parse`) that fails outright on real
// phrasings a legal/ordinance corpus actually uses — measured here, not
// assumed: "31/12/2024" (day-first) and "Jan. 1st, 2020" (ordinal +
// abbreviation) both return NaN from bare `Date.parse`, and JS's own date
// parsing beyond ISO 8601 is famously engine-inconsistent (ECMA-262 only
// guarantees ISO). Python's `dateutil.parser` — already vendored,
// `python-dateutil` is in this repo's own `node_modules/pyodide/
// pyodide-lock.json`, reachable through the wheel organ, P21 — correctly
// parses both, plus the day-first/month-first ambiguity a corpus's own
// locale can disambiguate (`dayfirst` is a declared, caller-passed
// option here, never guessed).
//
// COST, disclosed rather than hidden: pyodide's own boot is ~9s (this
// repo's own documented figure, P18/P21). This is an OFFLINE / BATCH
// tool — amortize the boot across many dates in one process, never call
// it per-claim inside a live turn's own completion path (the browser's
// own `term-py-worker.mjs` is the live-page equivalent, gated the same
// way every other pyodide use in this app already is). This file runs
// under plain Node via the vendored `pyodide` npm package's own
// Node-compatible mode — no browser required for offline corpus work.
//
// createDateNormalizer boots pyodide + dateutil ONCE and returns a
// `parseDate`-shaped function (string -> ms | NaN) matching `Date.parse`'s
// own contract exactly, so it drops into eoreader7's
// `regime.js::parseValidityWindow`'s `parseDate` parameter unchanged.
//
//   node scripts/date-normalize.mjs "31/12/2024" "Jan. 1st, 2020" "2020-01-01"

import { loadPyodide } from "pyodide";

export async function createDateNormalizer({ dayfirst = false } = {}) {
  const pyodide = await loadPyodide();
  await pyodide.loadPackage("python-dateutil");
  pyodide.globals.set("DAYFIRST", dayfirst);
  await pyodide.runPythonAsync(`
from dateutil import parser as _dateutil_parser
def _parse_date_ms(s):
    try:
        dt = _dateutil_parser.parse(s, dayfirst=DAYFIRST)
        if dt.tzinfo is None:
            from datetime import timezone
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp() * 1000
    except Exception:
        return float("nan")
  `);
  const parseDateMs = pyodide.globals.get("_parse_date_ms");
  const parseDate = (str) => {
    const ms = parseDateMs(String(str ?? ""));
    return Number.isFinite(ms) ? ms : NaN;
  };
  return { parseDate, shutdown: () => parseDateMs?.destroy?.() };
}

async function main() {
  const inputs = process.argv.slice(2);
  if (!inputs.length) {
    console.error("usage: date-normalize.mjs <date string> [<date string> ...]");
    process.exit(1);
  }
  const { parseDate } = await createDateNormalizer();
  for (const s of inputs) {
    const ms = parseDate(s);
    const jsMs = Date.parse(s);
    console.log(JSON.stringify({
      input: s,
      dateutil: Number.isFinite(ms) ? new Date(ms).toISOString() : "FAILED",
      native_Date_parse: Number.isFinite(jsMs) ? new Date(jsMs).toISOString() : "FAILED",
    }));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.error(err.stack || err); process.exit(1); });
}
