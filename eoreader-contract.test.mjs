import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contract = JSON.parse(readFileSync(new URL("./eoreader-contract.json", import.meta.url), "utf8"));

const read = (name) => readFileSync(new URL(`./${name}`, import.meta.url), "utf8");

function importedNames(source, modulePath) {
  const escaped = modulePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`import\\s*\\{([\\s\\S]*?)\\}\\s*from\\s*["']${escaped}["']`));
  if (!match) return [];
  return match[1]
    .split(",")
    .map((part) => part.trim().split(/\\s+as\\s+/)[0])
    .filter(Boolean);
}

test("EOReader contract records the exact browser engine modules used by app.js", () => {
  const source = read("app.js");
  const actual = [...source.matchAll(/from\s+["'](\/engine\/[^"']+)["']/g)].map((m) => m[1]).sort();
  const expected = [...contract.runtimeConsumers.browserEngineModules["app.js"]].sort();
  assert.deepEqual(actual, expected, "app.js EOReader browser imports changed; update the compatibility contract deliberately");
});

test("EOReader contract records the exact browser NATIVE (engine-v7) modules used by app.js", () => {
  // Same mechanism as the /engine test above, aimed at the ratchet's other
  // side — the migrationLaw's own point: an import path only moves once it
  // is measured (parity against the frozen provider on real material, not
  // just export-shape agreement) AND the contract is updated to say so in
  // the same commit. This test is what makes a future silent re-widening of
  // app.js's /engine surface (or a silent narrowing of /engine-v7 nobody
  // recorded) fail loudly instead of drifting unnoticed, the same posture
  // the /engine test already holds.
  const source = read("app.js");
  const actual = [...source.matchAll(/from\s+["'](\/engine-v7\/[^"']+)["']/g)].map((m) => m[1]).sort();
  const expected = [...contract.runtimeConsumers.browserNativeModules["app.js"]].sort();
  assert.deepEqual(actual, expected, "app.js EOReader-native browser imports changed; update the compatibility contract deliberately");
});

test("EOReader contract records host imports used by runtime workers", () => {
  for (const [file, spec] of Object.entries(contract.runtimeConsumers.nodeImports)) {
    if (!spec.module || !spec.exports) continue;
    const source = read(file);
    assert.ok(source.includes(spec.module), `${file} no longer imports the declared EOReader host module`);
    const actual = importedNames(source, spec.module).sort();
    const expected = [...spec.exports].sort();
    assert.deepEqual(actual, expected, `${file} EOReader host exports changed; update the compatibility contract deliberately`);
  }
});

test("EOReader contract records runtime filesystem mounts", () => {
  for (const [file, mounts] of Object.entries(contract.runtimeConsumers.filesystemMounts)) {
    const source = read(file);
    for (const mount of mounts) {
      const parts = mount.split("/");
      for (const part of parts) {
        assert.ok(source.includes(`"${part}"`), `${file} no longer contains declared EOReader mount component ${part}`);
      }
    }
    assert.ok(source.includes('"eoreader7", "legacy-eoreader6.1"'), `${file} no longer declares the current EOReader sibling mount`);
  }
});

test("serve.mjs still validates build records with EOReader task-log", () => {
  const source = read("serve.mjs");
  const spec = contract.runtimeConsumers.nodeImports["serve.mjs"];
  for (const part of spec.dynamicModule.split("/")) {
    assert.ok(source.includes(`"${part}"`), `serve.mjs task-log dependency changed at ${part}`);
  }
  assert.match(source, /buildVocab\s*=\s*await import\(/, "serve.mjs no longer dynamically loads the engine task vocabulary");
});

test("testTimeConsumers: every declared eoreader7-native module path is actually referenced by every file that claims to consume it", () => {
  // Weaker than the nodeImports check above on purpose: this section's
  // consumers mix static imports (eval/measured-memory-b.mjs) with
  // try/catch-guarded dynamic ones in several different destructuring
  // shapes (fold.test.mjs/retrieval.test.mjs/consequence.test.mjs — see
  // each file's own header for why: a checkout without eoreader7 as a
  // sibling degrades to a typed skip rather than failing the whole file to
  // load, which a top-level static import cannot do). A single regex
  // cannot verify an exact export-name match across that many shapes
  // honestly, so this checks the one thing that generalizes: the module
  // PATH itself is still where the contract says it is.
  const modules = contract.testTimeConsumers.eoreader7Native.modules;
  for (const [modulePath, spec] of Object.entries(modules)) {
    for (const file of spec.consumedBy) {
      const source = read(file);
      assert.ok(
        source.includes(modulePath),
        `${file} no longer references ${modulePath}; update testTimeConsumers deliberately`,
      );
    }
  }
});

test("contract pins the 6.1 reference head used to begin the v7 compatibility baseline", () => {
  assert.equal(contract.reference.repository, "clovenbradshaw-ctrl/eoreader6.1");
  assert.match(contract.reference.observedHead, /^[0-9a-f]{40}$/);
  assert.ok(contract.semanticCapabilities.length >= 10, "semantic compatibility floor should remain explicit");
  assert.ok(contract.migrationLaw.some((line) => /without requiring The Fold runtime changes/.test(line)));
});
