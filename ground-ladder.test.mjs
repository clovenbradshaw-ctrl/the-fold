import test from "node:test";
import assert from "node:assert/strict";
import { groundOf, groundLine, namesIn, TIERS } from "./ground-ladder.js";

const passages = [{ ref: "a.txt#0-60", text: "Amelia Hartley founded the Northgate Observatory in 1887." }, { ref: "b.txt#0-40", text: "The observatory opened in 1889." }];
const ctx = { passages, model: "gemma2:2b", resolveName: (n) => (/hartley|northgate/i.test(n) ? new Set(["r1"]) : new Set()) };

test("the ladder places a sentence on its highest rung and names the cell backstage", () => {
  const s = "Amelia Hartley founded the Northgate Observatory in 1887.";
  const bound = groundOf(s, { ...ctx, claims: [{ sentence: s, end1: "Amelia Hartley", label: "founded", end2: "the Northgate Observatory in 1887", verdict: "bound", spans: [{ ref: "a.txt#0-60", start: 0, end: 57 }] }] });
  assert.equal(bound.tier, "bound"); assert.equal(bound.cell, "CON·Figure"); assert.deepEqual(bound.addresses, ["a.txt#0-60"]);
  assert.match(groundLine(bound), /^stated at a\.txt#0-60$/);
  const wit = groundOf(s, { ...ctx, witness: { sentence: s, witness: "states", decider: "founded the Northgate Observatory in 1887" } });
  assert.equal(wit.tier, "witnessed"); assert.deepEqual(wit.addresses, ["a.txt#0-60"], "the passage holding the decider is the address");
  const rec = groundOf(s, { ...ctx, claims: [{ sentence: s, end1: "Amelia Hartley", label: "founded", end2: "the Northgate Observatory in 1887", verdict: "unbound" }], notes: [{ subject: "Amelia Hartley", verb: "founded", object: "the Northgate Observatory in 1887", witnesses: ["a.txt#0-60~r1", "c.txt#5-50~r1"] }] });
  assert.equal(rec.tier, "recorded"); assert.match(rec.phrase, /2 sources/); assert.deepEqual(rec.addresses, ["a.txt#0-60", "c.txt#5-50"]);
  const con = groundOf(s, { ...ctx, claims: [{ sentence: s, end1: "Amelia Hartley", label: "founded", end2: "the Northgate Observatory in 1887", verdict: "unbound" }], notes: [{ subject: "Amelia Hartley", verb: "founded", object: "the Northgate Observatory in 1887", witnesses: ["a.txt#0-60~r1"], disputedBy: ["b.txt"] }] });
  assert.equal(con.tier, "contested"); assert.equal(con.cell, "CON·Figure·CONTESTED");
  const dv = groundOf("Rowan Vale preceded Owen Blythe.", { ...ctx, resolveName: () => new Set(), derived: [{ subject: "Rowan Vale", verb: "preceded", object: "Owen Blythe", premises: ["p1", "p2"] }] });
  assert.equal(dv.tier, "derived"); assert.deepEqual(dv.addresses, ["p1", "p2"]);
  const named = groundOf("Amelia Hartley loved comets.", ctx);
  assert.equal(named.tier, "named"); assert.deepEqual(named.names, ["Amelia Hartley"]); assert.deepEqual(named.addresses, ["a.txt#0-60"]);
  const self = groundOf("The show ran nine seasons.", { ...ctx, witness: { witness: "refused" } });
  assert.equal(self.tier, "self"); assert.equal(self.cell, "self:model"); assert.equal(groundLine(self), "gemma2:2b — no source states this");
  const unasked = groundOf("The show ran nine seasons.", { ...ctx, witness: { witness: "skipped", why: "budget" } });
  assert.equal(unasked.tier, "self"); assert.match(unasked.detail, /not asked/); assert.equal(unasked.reached.witness, false, "a rung that never reached the sentence is said so");
  assert.deepEqual(TIERS, ["bound", "witnessed", "recorded", "derived", "contested", "named", "self"]);
});

test("names in a sentence are capitalised runs, never sentence-initial function words", () => {
  assert.deepEqual(namesIn("The X-Files was created by Chris Carter and aired on Fox."), ["X-Files", "Chris Carter", "Fox"]);
  assert.deepEqual(namesIn("Some viewers loved \"I Want to Believe\" and its tagline Trust No One, said Chris Carter."), ["Trust No One", "Chris Carter"], "a lone capitalised word at the sentence's start or inside a quoted title is capitalisation, not a name; a multi-word run still counts");
  assert.deepEqual(namesIn("Despite these successes, Mulder returned."), ["Mulder"], "a lone name mid-sentence counts");
});
