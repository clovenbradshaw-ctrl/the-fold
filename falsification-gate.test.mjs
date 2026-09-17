// falsification-gate.test.mjs — the mechanical half of POLICIES.md's P244.
// P71's generality-gate.test.mjs checks that a POLICIES.md entry making a
// `universal` claim discloses HOW it was tested. That gate says nothing
// about a fix (or a disclosed refusal-to-fix) that never claims universal
// at all — which is most of what a relation/coreference-organ investigation
// actually produces (a narrow, correctly-scoped fix; three checked declines
// with no code landed). This test extends the same scan pattern one class
// narrower: any entry that names one of the governed organ files must ALSO
// disclose whether the required falsification protocol (P244) ran, was not
// attempted with a named reason, or was declined with a named reason.
//
// Like P71's own gate, this checks DISCLOSURE only, never TRUTH — no test
// can confirm a cross-domain replay genuinely happened or that a decline's
// stated reason is correct.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.resolve(here, p), "utf8");

function lawSections(markdown, prefix) {
  const lines = markdown.split("\n");
  const headRe = new RegExp(`^## ${prefix}(\\d+)\\b`);
  const heads = [];
  lines.forEach((line, i) => {
    const m = line.match(headRe);
    if (m) heads.push({ n: Number(m[1]), line: i });
  });
  return heads.map((h, idx) => ({
    n: h.n,
    text: lines
      .slice(h.line, idx + 1 < heads.length ? heads[idx + 1].line : lines.length)
      .join("\n"),
  }));
}

// The exact organ files P244 declares as the governed class.
const RELATION_ORGAN_RE = /\b(hypergraph\.js|pronouns\.js|relations\.js|surfaces\.js|morphology\.js)\b/;

const FALSIFICATION_TAG =
  /\*\*Falsification:\*\*\s*(ran \(|not attempted —|declined —|not-applicable)/;

test("P244: this entry exists and declares its own falsification standing", () => {
  const policies = read("POLICIES.md");
  const p244 = lawSections(policies, "P").find((e) => e.n === 244);
  assert.ok(p244, "P244 must exist in POLICIES.md");
  assert.match(p244.text, FALSIFICATION_TAG, "P244 must tag its own claim");
});

test("P244: names both P71's three legs and its own two additions", () => {
  const policies = read("POLICIES.md");
  const p244 = lawSections(policies, "P").find((e) => e.n === 244);
  assert.match(p244.text, /[Cc]ross-domain replay/, "P71's leg 1 is cited");
  assert.match(p244.text, /named giver/, "P71's leg 2 is cited");
  assert.match(p244.text, /[Dd]emonstrated.necessity/, "P71's leg 3 is cited");
  assert.match(p244.text, /[Oo]mnilingual disclosure/, "leg 4: omnilingual disclosure, not coverage");
  assert.match(p244.text, /first-class result/i, "leg 5: a decline is a valid terminal state");
});

test("P244+: every policy entry from here on that names a governed relation/coreference organ discloses its falsification standing", () => {
  const policies = read("POLICIES.md");
  const entries = lawSections(policies, "P").filter((e) => e.n >= 244);
  assert.ok(entries.length > 0, "at least P244 itself must be scanned");
  for (const e of entries) {
    if (!RELATION_ORGAN_RE.test(e.text)) continue;
    assert.match(
      e.text,
      FALSIFICATION_TAG,
      `P${e.n} names a governed organ (${RELATION_ORGAN_RE.exec(e.text)[1]}) and must declare Falsification: ran (...) | not attempted — ... | declined — ... | not-applicable (P244)`,
    );
  }
});
