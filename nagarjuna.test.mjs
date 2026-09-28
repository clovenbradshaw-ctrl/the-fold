import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeNagarjuna, RULES, SEVERITY } from "../eoreader7/native/organs/nagarjuna.js";
import { BOUND, CONTRADICTED, CONTESTED, UNBOUND, BEYOND_REACH, flip } from "../eoreader7/native/interpretation/hl.js";

const nagarjuna = makeNagarjuna({ lattice: { BOUND, CONTRADICTED, CONTESTED, UNBOUND, BEYOND_REACH }, flip });

test("makeNagarjuna refuses to construct without a real lattice and flip", () => {
  assert.throws(() => makeNagarjuna({}));
  assert.throws(() => makeNagarjuna({ lattice: { BOUND }, flip: null }));
});

test("checkLatticeUsage: hl.js's own values pass; a synonym or a typo is caught", () => {
  const clean = nagarjuna.checkLatticeUsage({ SETTLED: BOUND, FAILED: CONTRADICTED, MIXED: CONTESTED });
  assert.equal(clean.findings.length, 0);
  assert.equal(clean.checked, 3);

  const drifted = nagarjuna.checkLatticeUsage([
    { name: "SETTLED", value: "settled" }, // a re-typed synonym, not hl.js's "bound"
    { name: "OK", value: BOUND },
  ]);
  assert.equal(drifted.findings.length, 1);
  assert.equal(drifted.findings[0].rule, "one-lattice");
  assert.equal(drifted.findings[0].name, "SETTLED");
});

test("checkInvolution: hl.js's own flip proves itself (bound<->contradicted, the rest fixed)", () => {
  const r = nagarjuna.checkInvolution();
  assert.equal(r.holds, true);
  assert.equal(r.findings.length, 0);
});

test("checkInvolution: a broken flip is caught", () => {
  const brokenFlip = () => "always-this";
  const broken = makeNagarjuna({ lattice: { BOUND, CONTRADICTED, CONTESTED, UNBOUND, BEYOND_REACH }, flip: brokenFlip });
  const r = broken.checkInvolution();
  assert.equal(r.holds, false);
  assert.ok(r.findings.length > 0);
  assert.equal(r.findings[0].rule, "involution-holds");
});

test("checkInvolution: a partial value set (missing corners) is not penalized for what it never declared", () => {
  const r = nagarjuna.checkInvolution({ BOUND, CONTRADICTED }); // no CONTESTED/UNBOUND/BEYOND_REACH declared
  assert.equal(r.holds, true);
});

test("checkNameCollision: fewer than two exporters is not a collision", () => {
  const r = nagarjuna.checkNameCollision({ name: "declareVoid", files: [{ path: "a.js", header: "" }] });
  assert.equal(r.collision, false);
  assert.equal(r.findings.length, 0);
});

test("checkNameCollision: two files sharing a name, neither naming the other, both flagged", () => {
  const r = nagarjuna.checkNameCollision({
    name: "declareVoid",
    files: [
      { path: "a/void-shape.js", header: "// void-shape.js — zero the space." },
      { path: "b/notes.js", header: "// notes.js — the ledger." },
    ],
  });
  assert.equal(r.collision, true);
  assert.equal(r.findings.length, 2);
  assert.deepEqual(new Set(r.findings.map((f) => f.path)), new Set(["a/void-shape.js", "b/notes.js"]));
});

test("checkNameCollision: a header naming its sibling is not flagged", () => {
  const r = nagarjuna.checkNameCollision({
    name: "declareVoid",
    files: [
      { path: "a/void-shape.js", header: "// void-shape.js — see notes.js for the OTHER declareVoid." },
      { path: "b/notes.js", header: "// notes.js — see void-shape.js for the OTHER declareVoid." },
    ],
  });
  assert.equal(r.findings.length, 0);
});

// The real specimen this file was built for: `declareVoid` in
// the-fold/void-shape.js and eoreader7/native/kernel/notes.js, checked
// against the ACTUAL files on disk, not a stand-in — both now carry
// Nagarjuna's own disambiguation note, added the same day this module was
// written, so this is a live regression guard, not a hypothetical.
test("checkNameCollision: the real declareVoid collision is resolved on disk", () => {
  const shapeHeader = readFileSync(new URL("./void-shape.js", import.meta.url), "utf8").slice(0, 2000);
  const notesHeader = readFileSync(new URL("../eoreader7/native/kernel/notes.js", import.meta.url), "utf8").slice(0, 2000);
  const r = nagarjuna.checkNameCollision({
    name: "declareVoid",
    files: [
      { path: "the-fold/void-shape.js", header: shapeHeader },
      { path: "eoreader7/native/kernel/notes.js", header: notesHeader },
    ],
  });
  assert.equal(r.findings.length, 0, JSON.stringify(r.findings));
});

test("precision-race.js's CONCLUSION is hl.js's own values, not a second lattice — checked mechanically, not by inspection", async () => {
  const { CONCLUSION } = await import("../eoreader7/native/organs/precision-race.js");
  const r = nagarjuna.checkLatticeUsage(CONCLUSION);
  assert.equal(r.findings.length, 0, JSON.stringify(r.findings));
});

test("RULES: every id used by checkLatticeUsage/checkInvolution/checkNameCollision is declared", () => {
  const ids = new Set(RULES.map((r) => r.id));
  assert.ok(ids.has("one-lattice"));
  assert.ok(ids.has("involution-holds"));
  assert.ok(ids.has("same-name-named"));
  for (const r of RULES) assert.ok(Object.values(SEVERITY).includes(r.severity));
});
