// node --test anchor-chase.test.mjs — real grounding.js / source.js organs, no model.
import { test } from "node:test";
import assert from "node:assert/strict";
import { anchorFindings, anchorPassages } from "./anchor-chase.js";

const P = [
  { ref: "s#a", text: "A separate project, the Ostrin footbridge, opened in June 2029 and is managed by the parks department. Its opening was led by councillor Pavel Draga." },
  { ref: "s#b", text: "The Vellmar bridge reopened to traffic on 4 March 2031 after a two-year closure. The reopening ceremony was led by the harbour master, Ines Okafor." },
  { ref: "s#c", text: "The bridge carries 12,000 vehicles a day. The older Karst tunnel carries 9,500 vehicles a day." },
];
const Q = "Who led the opening of the Ostrin footbridge?";

test("anchor passage is the one covering the question's own words", () => {
  assert.deepEqual(anchorPassages(Q, P).anchors.map((p) => p.ref), ["s#a"]);
});
test("distractor's leader is foreign", () => {
  const f = anchorFindings(Q, P, "The opening of the Ostrin footbridge was led by the harbour master, Ines Okafor.");
  assert.ok(f); assert.deepEqual(f.foreign.map((a) => a.text), ["Ines Okafor"]);
});
test("stranger name is foreign", () => assert.ok(anchorFindings(Q, P, "It was led by Armin Straub.")));
test("the anchored answer is left alone", () => assert.equal(anchorFindings(Q, P, "Councillor Pavel Draga led the opening."), null));
test("control: a derived number held by no passage does not fire", () =>
  assert.equal(anchorFindings("Which carries more vehicles a day, the bridge or the Karst tunnel, and by how many?", P, "The bridge carries 2,500 more than the tunnel."), null));
test("control: one passage or a coverage tie means nothing to prefer", () => {
  assert.equal(anchorFindings(Q, [P[1]], "Ines Okafor"), null);
  assert.equal(anchorPassages("bridge", [P[1], P[2]]), null);
});

test("a passage another witness promoted (retrievedVia relative) is an anchor, never a distractor to narrow away", () => {
  const p = (ref, text, extra = {}) => ({ ref, text, ...extra });
  const passages = [
    p("a#0", "The Kessington report put the harbor figure at 12% for the spring quarter."),
    p("b#0", "Dredging of the shipping channel runs through March under the port authority schedule.", { retrievedVia: "relative" }),
  ];
  assert.equal(anchorFindings("what was the harbor figure?", passages, "The dredging schedule runs through March."), null, "the promoted passage's particular is not foreign");
  const unpromoted = [passages[0], { ...passages[1], retrievedVia: undefined }];
  assert.ok(anchorFindings("what was the harbor figure?", unpromoted, "The dredging schedule runs through March."), "control: the same passage un-vouched IS a distractor");
});
