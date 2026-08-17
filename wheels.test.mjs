// wheels.test.mjs — P21's pure half, against a small realistic fixture
// lock rather than the real 356-package pyodide-lock.json (the fixture
// covers the shapes that matter: a leaf, a diamond, and a miss — the real
// file is exercised live, not by this offline test).

import test from "node:test";
import assert from "node:assert/strict";
import { wheelClosure } from "./wheels.js";

const LOCK = {
  numpy: { version: "2.1.0", file_name: "numpy-2.1.0-cp314.whl", sha256: "aaa", depends: [] },
  // a diamond: pandas and scikit-learn both depend on numpy — the closure
  // must carry numpy's wheel exactly once, not twice.
  pandas: { version: "2.2.0", file_name: "pandas-2.2.0-cp314.whl", sha256: "bbb", depends: ["numpy"] },
  "scikit-learn": { version: "1.5.0", file_name: "scikit_learn-1.5.0-cp314.whl", sha256: "ccc", depends: ["numpy", "scipy"] },
  scipy: { version: "1.14.0", file_name: "scipy-1.14.0-cp314.whl", sha256: "ddd", depends: ["numpy"] },
};

test("a leaf package with no dependencies resolves to itself alone", () => {
  const c = wheelClosure("numpy", LOCK);
  assert.equal(c.key, "numpy");
  assert.equal(c.version, "2.1.0");
  assert.deepEqual(c.wheels, [{ name: "numpy", version: "2.1.0", file_name: "numpy-2.1.0-cp314.whl", sha256: "aaa" }]);
});

test("a package with a dependency carries both wheels", () => {
  const c = wheelClosure("pandas", LOCK);
  assert.deepEqual(c.wheels.map((w) => w.name).sort(), ["numpy", "pandas"]);
});

test("a diamond dependency is walked once, not once per path", () => {
  const c = wheelClosure("scikit-learn", LOCK);
  const names = c.wheels.map((w) => w.name).sort();
  assert.deepEqual(names, ["numpy", "scikit-learn", "scipy"], "numpy must appear exactly once despite two paths to it");
});

test("name lookup falls back to lowercase, matching the fetch script's own rule", () => {
  const c = wheelClosure("Scikit-Learn", LOCK);
  assert.equal(c.key, "scikit-learn");
});

test("a name outside the lock returns null — a typed refusal, never a silent miss", () => {
  assert.equal(wheelClosure("some-arbitrary-pypi-only-package", LOCK), null);
});

test("every wheel entry carries exactly its own sha256, never the requested package's", () => {
  const c = wheelClosure("scikit-learn", LOCK);
  const byName = Object.fromEntries(c.wheels.map((w) => [w.name, w.sha256]));
  assert.equal(byName.numpy, "aaa");
  assert.equal(byName.scipy, "ddd");
  assert.equal(byName["scikit-learn"], "ccc");
});
