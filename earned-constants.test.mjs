// earned-constants.test.mjs — the mechanical half of FOLD-CONSTITUTION II.11.
//
// II.11, the earned-constant test: "Every threshold, cutoff, minimum count,
// and top-N names the run that derived it, or the pipeline carries the flag
// downstream. This is not a refusal: a person may set a cutoff by hand and
// say so, at which point it is `received` and names them as its giver. What
// is refused is a constant with no giver and no measurement — a judgment
// wearing the clothes of a setting."
//
// Nothing enforced it. On 2026-09-06 a survey of this repo's own inference
// machinery found II.11 UNWIRED, and the same session found four separate
// violations of it in one afternoon: `strain.js`'s coverage floor (which
// measurement showed destroys 97% of the information in the best predictor
// the turn has), P143's own first SEG cell (a median bin on a distribution
// where 915 of 1,000 turns held the same value), and `retrieval-prior.js`'s
// two scoring bonuses. Finding the same defect four times in one session is
// what a ratchet is for.
//
// THIS IS A RATCHET, NOT A THRESHOLD. It does not pretend the 59 constants
// already standing are fixed. It records them as a disclosed baseline and
// fails when a NEW one appears — the P25 pattern. Accounting for one of the
// baseline entries and removing it from the file is always welcome; the test
// checks that direction too, so the baseline cannot quietly grow back.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// A constant accounts for itself when the comment attached to it — its own
// trailing comment, or the comment block immediately above — names either a
// measurement (a run, a date, a policy, the words measured/derived/null) or a
// giver. Both halves of II.11 are accepted: earned, or received and said so.
const ACCOUNTED = /\b(measured|derived|giver|declared by|the run that|P\d{1,3}\b|S\d{1,3}\b|\d{4}-\d{2}-\d{2}|convention|by construction|the standard|arbitrary but|chosen by|set by hand)\b/i;

// A JUDGMENT decides something about the material; a BUDGET decides how much
// of it to show or spend. II.11 covers both, and being wrong about a floor is
// not the same as being wrong about a snippet length, so the two are reported
// apart.
const JUDGMENT = /(FLOOR|THRESHOLD|_CUT|BONUS|WEIGHT|^MIN_|_MIN$|RATIO|SHARE)/;

export function scanConstants(dir) {
  const rows = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".js")).sort()) {
    const lines = fs.readFileSync(path.join(dir, f), "utf8").split("\n");
    lines.forEach((line, i) => {
      const m = line.match(/^export const ([A-Z][A-Z0-9_]*)\s*=\s*(-?[0-9][0-9._e]*)\s*;?(.*)$/);
      if (!m) return;
      let ctx = m[3] || "";
      for (let j = i - 1; j >= 0 && j > i - 14; j--) {
        const t = lines[j].trim();
        if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) ctx = `${t} ${ctx}`;
        else if (t === "") continue;
        else break;
      }
      rows.push({ file: f, name: m[1], value: m[2], accounted: ACCOUNTED.test(ctx), judgment: JUDGMENT.test(m[1]) });
    });
  }
  return rows;
}

const BASELINE_PATH = path.join(here, "earned-constants.json");
const key = (r) => `${r.file}:${r.name}`;

test("II.11: no NEW constant may appear without naming its measurement or its giver", () => {
  const rows = scanConstants(here);
  const baseline = new Set(JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")).unaccounted);
  const unaccounted = rows.filter((r) => !r.accounted).map(key);
  const fresh = unaccounted.filter((k) => !baseline.has(k));
  assert.deepEqual(
    fresh, [],
    `${fresh.length} constant(s) with no measurement and no giver — a judgment wearing the clothes of a setting (II.11).\n` +
    `Either say where the number came from in a comment on it, or, if a person set it, say so and name them.\n` +
    `New: ${fresh.join(", ")}`,
  );
});

test("II.11: the baseline may only shrink — a constant that was accounted for may not quietly stop being", () => {
  const rows = scanConstants(here);
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")).unaccounted;
  const still = new Set(rows.filter((r) => !r.accounted).map(key));
  const fixed = baseline.filter((k) => !still.has(k));
  // Nothing to assert about `fixed` except that the file should be updated
  // when it is non-empty; the ratchet's teeth are in the test above. This one
  // fails only if the baseline names something that no longer exists at all,
  // which means the file has gone stale and stopped protecting anything.
  const names = new Set(rows.map(key));
  const gone = baseline.filter((k) => !names.has(k));
  assert.deepEqual(gone, [], `the baseline names constants that no longer exist — regenerate it: ${gone.join(", ")}`);
  if (fixed.length) console.log(`  (${fixed.length} baseline constant(s) now account for themselves; they may be removed from earned-constants.json)`);
});

test("II.11: the check can actually fail — a planted unearned constant is caught", () => {
  // THE CONTROL. A gate that cannot fail reports `unmeasured`, never `pass`
  // (II.10, the very next article). This plants one and reads the verdict.
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "earned-"));
  fs.writeFileSync(path.join(dir, "planted.js"), "export const MYSTERY_FLOOR = 0.34;\n");
  fs.writeFileSync(path.join(dir, "honest.js"), "// measured 2026-09-06 over the 1,000-turn run\nexport const HONEST_FLOOR = 0.5;\n");
  const rows = scanConstants(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  const planted = rows.find((r) => r.name === "MYSTERY_FLOOR");
  const honest = rows.find((r) => r.name === "HONEST_FLOOR");
  assert.equal(planted.accounted, false, "an unearned constant must be caught");
  assert.equal(planted.judgment, true, "a FLOOR is a judgment, not a budget");
  assert.equal(honest.accounted, true, "a constant that names its measurement must pass");
});

test("II.11: judgments are reported apart from budgets — being wrong about a floor is not being wrong about a snippet length", () => {
  const rows = scanConstants(here);
  const j = rows.filter((r) => !r.accounted && r.judgment);
  // Not an assertion about the count: a disclosure, printed so the standing
  // debt is visible on every run rather than discoverable only by audit.
  console.log(`  II.11 standing debt: ${rows.filter((r) => !r.accounted).length} unaccounted of ${rows.length}, of which ${j.length} decide something about the material:`);
  for (const r of j) console.log(`    ${r.file}:${r.name} = ${r.value}`);
  assert.ok(rows.length > 0, "the scanner must find constants at all");
});
