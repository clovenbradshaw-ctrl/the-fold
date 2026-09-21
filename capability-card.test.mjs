import { test } from "node:test";
import assert from "node:assert";
import { capabilityCard, promptIdentityLine, registryFromRows } from "./capability-card.js";

const registry = {
  can: ["questioning material you attach", "building and revising code/text folds", "running code in the sandboxed terminal", "checking claims with your consent"],
  limits: ["using the live web while web checking is off", "running anything outside the browser sandbox", "recalling beyond this conversation's record"],
};

test("card states identity (M-05 / PRX-04)", () => {
  assert.ok(capabilityCard(registry).startsWith("I am an AI assistant"));
});

test("card states capabilities and limits (PRX-02)", () => {
  const c = capabilityCard(registry);
  assert.ok(c.includes("I can help with:"));
  assert.ok(c.includes("I cannot help with:"));
});

test("card carries the paper-verbatim human path (M-08)", () => {
  assert.ok(capabilityCard(registry).includes("You can reach a human agent at any point."));
});

test("empty limits omits the line rather than lying", () => {
  const c = capabilityCard({ can: ["x"] });
  assert.ok(!c.includes("cannot help"));
});

test("promptIdentityLine is firewall-safe (no apparatus vocabulary)", () => {
  const l = promptIdentityLine();
  assert.equal(l, "You are The Fold, an AI assistant having a conversation.");
  for (const banned of ["instrument", "organ", "ledger", "apparatus"]) assert.ok(!l.includes(banned));
});

test("registryFromRows separates can from limits by declared names", () => {
  const rows = [
    { name: "web", label: "checking claims with your consent" },
    { name: "pip", label: "installing arbitrary packages (refused)" },
    { name: "run", label: "running code in the sandboxed terminal" },
  ];
  const { can, limits } = registryFromRows(rows, { limitNames: ["pip"] });
  assert.deepEqual(can, ["checking claims with your consent", "running code in the sandboxed terminal"]);
  assert.deepEqual(limits, ["installing arbitrary packages (refused)"]);
});