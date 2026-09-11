// help.test.mjs — the /help tutorial is DATA, so its walls are testable.
// The load-bearing one: app.js's DOORS literal and the HELP registry can
// never drift — a door nobody can teach is a door nobody can use, and a
// tutorial for a door that does not exist is noise.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { HELP, HELP_DOOR_NAMES, HELP_CATEGORIES, normalizeDoor, renderHelp } from "./help.js";

const APP = readFileSync(new URL("./app.js", import.meta.url), "utf8");

function doorsFromApp() {
  const m = APP.match(/const DOORS = Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(m, "app.js DOORS literal found");
  return [...m[1].matchAll(/"(\/[a-z][a-z-]*)"/g)].map((x) => x[1]);
}

test("every door app.js routes is in the tutorial, and vice versa", () => {
  const inApp = new Set(doorsFromApp());
  const inHelp = new Set(HELP_DOOR_NAMES);
  assert.deepEqual(
    [...inHelp].sort(),
    [...inApp].sort(),
    "HELP and DOORS must name exactly the same doors",
  );
});

test("every entry is complete: category, summary, syntax, example, tutorial, needs", () => {
  for (const [door, e] of Object.entries(HELP)) {
    assert.ok(HELP_CATEGORIES[e.category], `${door} has a real category`);
    for (const field of ["name", "summary", "syntax", "example", "tutorial", "needs"]) {
      assert.ok(typeof e[field] === "string" && e[field].trim().length > 0, `${door}.${field} is present and non-empty`);
    }
    assert.match(e.syntax, new RegExp(`^${door.replace("/", "\\/")}`), `${door}'s syntax begins with the door itself`);
  }
});

test("normalizeDoor: /, case, and trailing words are all tolerated", () => {
  assert.equal(normalizeDoor("fold"), "/fold");
  assert.equal(normalizeDoor("/FOLD"), "/fold");
  assert.equal(normalizeDoor("/fold extra words"), "/fold");
  assert.equal(normalizeDoor(""), null);
  assert.equal(normalizeDoor("/nope"), null);
});

test("the index lists every door by name", () => {
  const index = renderHelp("");
  for (const door of HELP_DOOR_NAMES) {
    assert.ok(index.includes(door), `index names ${door}`);
  }
  assert.ok(index.includes("/help <door>"), "index teaches itself");
  assert.ok(index.includes("paste a large block"), "index teaches the auto-source shortcut");
});

test("a known door renders its full card", () => {
  const card = renderHelp("fold");
  assert.ok(card.includes("/fold — Revise a fold"), "card names the door");
  assert.ok(card.includes("Syntax:"), "card has syntax");
  assert.ok(card.includes("Example:"), "card has an example");
  assert.ok(card.includes("You need:"), "card says what it needs");
  assert.ok(card.includes("/fold 2 make the spiral"), "card carries a real example");
});

test("an unknown door is refused, naming the doors", () => {
  const out = renderHelp("/not-a-door");
  assert.ok(out.includes("there is no door named"), "typed refusal");
  assert.ok(out.includes("/fold"), "the refusal points at real doors");
});

test("the /source door teaches the auto-source floor", () => {
  const card = renderHelp("source");
  assert.ok(card.includes("auto-named pasted.txt"), "card explains auto-naming");
  assert.ok(card.includes("never model output"), "card holds the material wall");
});