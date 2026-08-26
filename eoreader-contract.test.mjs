// eoreader-contract.test.mjs — the assay for eoreader-contract.json.
//
// The contract names every eoreader7 export the-fold's runtime expects to be
// able to import (Increment A of the reading-workbench spec:
// READING-WORKBENCH-ENGINE-PLAN.md). This test is the only thing that makes
// that declaration checkable rather than aspirational: it imports the REAL
// checkout at ../eoreader7 by relative path (the same convention
// build-log.test.mjs already uses for ../eoreader6.1) and asserts every
// declared export actually exists and is callable. No stub, no fixture —
// if ../eoreader7 is missing, stale, or has dropped an export, this fails.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const contract = JSON.parse(readFileSync(path.join(HERE, "eoreader-contract.json"), "utf8"));

test("the contract itself is the declared shape", () => {
  assert.equal(contract.schema, "EOReaderContract@1");
  assert.equal(contract.engine, "eoreader7");
  assert.ok(Array.isArray(contract.runtimeConsumers) && contract.runtimeConsumers.length > 0);
  for (const entry of contract.runtimeConsumers) {
    assert.equal(typeof entry.organ, "string");
    assert.equal(typeof entry.importPath, "string");
    assert.equal(typeof entry.export, "string");
    assert.equal(typeof entry.for, "string");
  }
});

// One dynamic-import test per declared consumer, generated from the
// contract's own list — the test walks the declaration, it does not
// hand-copy it, so a new runtimeConsumers entry gets covered automatically
// and a removed one stops being tested rather than silently failing here.
for (const entry of contract.runtimeConsumers) {
  test(`${contract.checkout}/${entry.importPath} really exports ${entry.export} (${entry.organ})`, async () => {
    const modUrl = new URL(`${contract.checkout}/${entry.importPath}`, import.meta.url);
    let mod;
    try {
      mod = await import(modUrl);
    } catch (err) {
      assert.fail(
        `${contract.checkout}/${entry.importPath} did not import cleanly — ` +
          `the checkout may be missing (clone clovenbradshaw-ctrl/eoreader7 as a sibling of the-fold) ` +
          `or the file may have moved. Underlying error: ${err.message}`
      );
    }
    assert.ok(
      entry.export in mod,
      `${entry.importPath} no longer exports "${entry.export}" — the migration guarantee ` +
        `Increment A exists to check has broken for the "${entry.organ}" organ (${entry.for})`
    );
    assert.equal(
      typeof mod[entry.export],
      "function",
      `${entry.export} exists but is not callable (typeof === "${typeof mod[entry.export]}") — ` +
        `every declared organ in this contract is expected to be a function`
    );
  });
}
