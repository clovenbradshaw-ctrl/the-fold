// node --test organ-audit.test.mjs
//
// Against the REAL registries, not fixtures — capacities.js's CAPACITIES
// and verification.js's VERIFICATION_GRID are both small, tested, and
// already on disk; stubbing them would test a shape this module doesn't
// actually consume in production, the same reason hypergraph.test.mjs
// runs against real engine organs rather than canned edges.

import { test } from "node:test";
import assert from "node:assert/strict";

import { CAPACITIES } from "./capacities.js";
import { VERIFICATION_GRID } from "./verification.js";
import { makeOrganAudit, phrase } from "./organ-audit.js";

function realAudit() {
  return makeOrganAudit({ capacities: CAPACITIES, grid: VERIFICATION_GRID });
}

test("refuses to construct without capacities — no default, no silent empty registry", () => {
  assert.throws(() => makeOrganAudit({ grid: VERIFICATION_GRID }), TypeError);
  assert.throws(() => makeOrganAudit({ capacities: [], grid: VERIFICATION_GRID }), TypeError);
});

test("refuses to construct without the grid — no default, no silent empty roster", () => {
  assert.throws(() => makeOrganAudit({ capacities: CAPACITIES }), TypeError);
  assert.throws(() => makeOrganAudit({ capacities: CAPACITIES, grid: [] }), TypeError);
});

test("a diff touching nothing registered audits nothing", () => {
  const { auditorsFor } = realAudit();
  const result = auditorsFor(["README.md", "index.html", "styles.css"]);
  assert.equal(result.touched.length, 0);
  assert.equal(result.auditors.length, 0);
  assert.equal(result.unregistered.length, 0);
  assert.match(phrase(result), /no organ changed/);
});

test("a real registered organ, by bare filename, resolves to its real persona", () => {
  const { auditorsFor } = realAudit();
  const result = auditorsFor(["hypergraph.js"]);
  assert.equal(result.touched.length, 1);
  assert.equal(result.touched[0].capacityId, "relations");
  assert.equal(result.touched[0].terrain, "Link");
  const linkPersona = VERIFICATION_GRID.find((c) => c.terrain === "Link").persona;
  assert.equal(result.touched[0].persona, linkPersona);
  assert.ok(result.auditors.includes(linkPersona));
});

test("the two standing seats (residual, meta) ride ANY organ change, not a specific cell", () => {
  const { auditorsFor } = realAudit();
  const result = auditorsFor(["hypergraph.js"]);
  assert.ok(result.auditors.includes("Chekhov"), "residual/reachability should always ride");
  assert.ok(result.auditors.includes("Longino"), "meta/conformance should always ride");
});

test("a full repo-relative path (spanning the eoreader7 boundary) still resolves", () => {
  const { auditorsFor } = realAudit();
  const derivationEntry = CAPACITIES.find((c) => c.id === "derive");
  assert.ok(derivationEntry, "fixture assumption: the 'derive' capacity exists in the real registry");
  const result = auditorsFor([derivationEntry.module]);
  assert.equal(result.touched.length, 1);
  assert.equal(result.touched[0].capacityId, "derive");
});

test("two changed files mapping to the SAME organ still report the organ once, not twice", () => {
  const { auditorsFor } = realAudit();
  // build-log.js backs two distinct capacities (build, rezero) at different
  // cells — both should surface, but each exactly once even if the diff
  // lists the file more than once (e.g. a rename shows up twice in some
  // diff tools).
  const result = auditorsFor(["build-log.js", "build-log.js"]);
  const rezeroHits = result.touched.filter((t) => t.capacityId === "rezero");
  assert.equal(rezeroHits.length, 1, "a repeated file path must not double-count one capacity");
});

test("one file can legitimately back more than one capacity, and both surface", () => {
  const { auditorsFor } = realAudit();
  const result = auditorsFor(["build-log.js"]);
  const ids = result.touched.map((t) => t.capacityId).sort();
  assert.ok(ids.includes("build"));
  assert.ok(ids.includes("rezero"));
});

test("a real .js file that is NOT registered is named, never silently dropped or guessed onto a cell", () => {
  const { auditorsFor } = realAudit();
  const result = auditorsFor(["app.js"]); // large, real, deliberately not in the capacity registry
  assert.ok(result.unregistered.includes("app.js"));
  assert.equal(result.touched.length, 0);
  assert.equal(result.auditors.length, 0, "an unregistered file must not trigger auditors — that would be exactly the silent guess this module refuses");
});

test("a non-script file (docs, markup) is neither touched nor unregistered — it is simply out of scope", () => {
  const { auditorsFor } = realAudit();
  const result = auditorsFor(["CLAUDE.md"]);
  assert.equal(result.touched.length, 0);
  assert.equal(result.unregistered.length, 0);
});

test("mixed diff: one registered organ, one unregistered script, one doc — each classified correctly", () => {
  const { auditorsFor } = realAudit();
  const result = auditorsFor(["cast.js", "app.js", "README.md"]);
  assert.equal(result.touched.length, 1);
  assert.equal(result.touched[0].capacityId, "cast");
  assert.deepEqual(result.unregistered, ["app.js"]);
  assert.ok(result.auditors.length > 0);
});

test("every registered capacity's terrain resolves to a real persona in the live grid — no cell is orphaned", () => {
  const terrainsWithPersona = new Set(VERIFICATION_GRID.filter((c) => c.persona).map((c) => c.terrain));
  const missing = CAPACITIES.filter((c) => !terrainsWithPersona.has(c.terrain));
  assert.deepEqual(
    missing.map((c) => `${c.id} (${c.terrain})`),
    [],
    "every capacity's terrain should have a persona in VERIFICATION_GRID, or organ-audit will silently under-report",
  );
});

test("phrase() names the organ, the capacity, the cell, and the persona — not just a count", () => {
  const { auditorsFor } = realAudit();
  const result = auditorsFor(["cast.js"]);
  const text = phrase(result);
  assert.match(text, /cast\.js/);
  assert.match(text, /Entity/);
});

test("an empty changed-files list is a no-op, not an error", () => {
  const { auditorsFor } = realAudit();
  const result = auditorsFor([]);
  assert.equal(result.auditors.length, 0);
  const result2 = auditorsFor(undefined);
  assert.equal(result2.auditors.length, 0);
});
