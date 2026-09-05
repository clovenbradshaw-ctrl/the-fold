import test from "node:test";
import assert from "node:assert/strict";
import { editPiece, editLine } from "./piece-edit.js";
import { splitSentences } from "./cite.js";

const S = (label, text, keys = []) => ({ label, text, claims: keys.map((key) => ({ key, verdict: "bound" })) });

test("a sentence that restates an earlier section is cut, as a SEG act with the sentence named; new prose stays", () => {
  const r = editPiece([
    S("Premise", "The X-Files is a science fiction series created by Chris Carter. It ran for nine seasons."),
    S("Agents", "The X-Files is a science fiction series created by Chris Carter. Mulder believes; Scully doubts."),
  ], { splitSentences });
  assert.equal(r.sections[1].text, "Mulder believes; Scully doubts.");
  assert.equal(r.edits.length, 1);
  assert.equal(r.edits[0].op, "SEG");
  assert.match(editLine(r.edits[0]), /^cut from "Agents": restates an earlier section/);
});

test("a section left with nothing is dropped with why; a section whose bound claims were all said is merged into the previous one", () => {
  const r = editPiece([
    S("Premise", "The show aired from 1993 to 2002 on Fox, and it was created by Chris Carter in Vancouver.", ["the x-files|aired|1993 to 2002"]),
    S("Echo", "The show aired from 1993 to 2002 on Fox, and it was created by Chris Carter in Vancouver."),
    S("Again", "It was a hit with viewers, and the network renewed it.", ["the x-files|aired|1993 to 2002"]),
    S("New", "Millennium was its first spin-off.", ["millennium|was|its first spin-off"]),
  ], { splitSentences });
  assert.deepEqual(r.sections.map((s) => s.label), ["Premise", "New"]);
  assert.match(r.sections[0].text, /renewed it\.$/, "the merged section's residue rides the previous one");
  assert.deepEqual(r.edits.map((e) => e.kind), ["restated-sentence", "empty-section", "merged-section"]);
  assert.equal(r.edits[2].op, "SYN");
});

test("control built to fail: a piece with no restatement and new claims in every section is untouched, zero edits", () => {
  const r = editPiece([S("A", "One thing happened here.", ["a|b|c"]), S("B", "Another thing happened there.", ["d|e|f"])], { splitSentences });
  assert.equal(r.edits.length, 0);
  assert.equal(r.sections.length, 2);
});
