// generality-gate.test.mjs — the mechanical half of POLICIES.md's P70.
// A policy entry may claim `universal`, `specimen-scoped`, or
// `not-applicable`; this test only checks that every entry from P70
// onward makes ONE of those three claims out loud. It cannot check that
// the claim is true — see P70's own "Enforced" paragraph.

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

const GENERALITY_TAG = /\*\*Generality:\*\*\s*(universal|specimen-scoped|not-applicable)\b/;

test("P70: this entry exists and declares its own generality", () => {
  const policies = read("POLICIES.md");
  const p70 = lawSections(policies, "P").find((e) => e.n === 70);
  assert.ok(p70, "P70 must exist in POLICIES.md");
  assert.match(p70.text, GENERALITY_TAG, "P70 must tag its own claim");
});

test("P70+: every policy entry from here on discloses whether its finding generalizes beyond the specimen that found it", () => {
  const policies = read("POLICIES.md");
  const entries = lawSections(policies, "P").filter((e) => e.n >= 70);
  assert.ok(entries.length > 0, "at least P70 itself must be scanned");
  for (const e of entries) {
    assert.match(
      e.text,
      GENERALITY_TAG,
      `P${e.n} must declare Generality: universal | specimen-scoped | not-applicable (P70)`,
    );
  }
});

test("P70: the three-part gate is named where the policy states it, not only implied", () => {
  const policies = read("POLICIES.md");
  const p70 = lawSections(policies, "P").find((e) => e.n === 70);
  assert.match(p70.text, /[Cc]ross-domain replay/, "leg 1: replay over an unrelated corpus");
  assert.match(p70.text, /named giver/, "leg 2: a giver or a derived floor, never a fit");
  assert.match(p70.text, /[Dd]emonstrated necessity/, "leg 3: a case the discovery never saw");
});

test("P70: the gate names its own failure mode — a performance difference is not a violation", () => {
  const policies = read("POLICIES.md");
  const p70 = lawSections(policies, "P").find((e) => e.n === 70);
  assert.match(p70.text, /performance difference/, "the anti-overcorrection clause is present");
});
